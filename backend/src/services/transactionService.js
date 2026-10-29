const { pool, withTransaction } = require("../config/db");
const AppError = require("../utils/AppError");
const { toPaise, toRupees } = require("../utils/money");
const { encodeCursor, decodeCursor } = require("../utils/pagination");

const MAX_AMOUNT_INR = 1000000; // ₹10 lakh

const result = (tx) => ({
  transaction_id: tx.id,
  status: tx.status,
  amount: toRupees(tx.amount_paise),
});

function replayExisting(tx, senderWalletId, receiverWalletId, amountPaise) {
  if (
    Number(tx.sender_wallet_id) !== Number(senderWalletId) ||
    Number(tx.receiver_wallet_id) !== Number(receiverWalletId) ||
    Number(tx.amount_paise) !== Number(amountPaise)
  ) {
    throw new AppError(409, "IDEMPOTENCY_KEY_CONFLICT");
  }
  if (tx.status === "FAILED") throw new AppError(400, "INSUFFICIENT_BALANCE");
  return result(tx);
}

async function findTransactionByKey(idempotencyKey) {
  const found = await pool.query(
    `SELECT id, idempotency_key, sender_wallet_id, receiver_wallet_id,
            amount_paise, status, created_at
     FROM transactions WHERE idempotency_key = $1`,
    [idempotencyKey]
  );
  return found.rows[0] || null;
}

async function transferMoney({ senderUserId, receiverUserId, amount, idempotencyKey }) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)
    throw new AppError(400, "Amount must be positive");
  if (amount > MAX_AMOUNT_INR) throw new AppError(400, "Amount cannot exceed ₹10,00,000");
  if (!Number.isInteger(receiverUserId)) throw new AppError(400, "receiver_user_id must be an integer");
  if (senderUserId === receiverUserId) throw new AppError(400, "Cannot transfer to yourself");

  const amountPaise = toPaise(amount);
  if (amountPaise <= 0) throw new AppError(400, "Amount must be positive");

  const walletsResult = await pool.query(
    `SELECT id, user_id, balance_paise
     FROM wallets WHERE user_id = ANY($1::integer[])`,
    [[senderUserId, receiverUserId]]
  );
  const senderWallet = walletsResult.rows.find((w) => Number(w.user_id) === senderUserId);
  const receiverWallet = walletsResult.rows.find((w) => Number(w.user_id) === receiverUserId);
  if (!senderWallet) throw new AppError(400, "Sender wallet not found");
  if (!receiverWallet) throw new AppError(400, "Receiver wallet not found");

  const existing = await findTransactionByKey(idempotencyKey);
  if (existing) return replayExisting(existing, senderWallet.id, receiverWallet.id, amountPaise);

  let insufficientBalance = false;
  try {
    const created = await withTransaction(async (client) => {
      // Lock both wallets in deterministic ID order to reduce deadlock risk.
      const lockedResult = await client.query(
        `SELECT id, user_id, balance_paise FROM wallets
         WHERE id = ANY($1::integer[]) ORDER BY id FOR UPDATE`,
        [[senderWallet.id, receiverWallet.id]]
      );
      const lockedSender = lockedResult.rows.find((w) => Number(w.id) === Number(senderWallet.id));
      const lockedReceiver = lockedResult.rows.find((w) => Number(w.id) === Number(receiverWallet.id));
      if (!lockedSender || !lockedReceiver) throw new AppError(400, "Wallet not found");

      if (Number(lockedSender.balance_paise) < amountPaise) {
        const failed = await client.query(
          `INSERT INTO transactions
             (idempotency_key, sender_wallet_id, receiver_wallet_id, amount_paise, status)
           VALUES ($1, $2, $3, $4, 'FAILED')
           RETURNING id, status, amount_paise`,
          [idempotencyKey, senderWallet.id, receiverWallet.id, amountPaise]
        );
        insufficientBalance = true;
        return failed.rows[0];
      }

      await client.query(
        "UPDATE wallets SET balance_paise = balance_paise - $1, updated_at = NOW() WHERE id = $2",
        [amountPaise, senderWallet.id]
      );
      await client.query(
        "UPDATE wallets SET balance_paise = balance_paise + $1, updated_at = NOW() WHERE id = $2",
        [amountPaise, receiverWallet.id]
      );
      const inserted = await client.query(
        `INSERT INTO transactions
           (idempotency_key, sender_wallet_id, receiver_wallet_id, amount_paise, status)
         VALUES ($1, $2, $3, $4, 'SUCCESS')
         RETURNING id, status, amount_paise`,
        [idempotencyKey, senderWallet.id, receiverWallet.id, amountPaise]
      );
      return inserted.rows[0];
    });

    if (insufficientBalance) throw new AppError(400, "INSUFFICIENT_BALANCE");
    return result(created);
  } catch (error) {
    // A concurrent request may have committed the same idempotency key.
    if (error.code === "23505" && error.constraint === "transactions_idempotency_key_key") {
      const winner = await findTransactionByKey(idempotencyKey);
      if (winner) return replayExisting(winner, senderWallet.id, receiverWallet.id, amountPaise);
      throw new AppError(409, "IDEMPOTENCY_KEY_CONFLICT");
    }
    throw error;
  }
}

async function getTransactionHistory({ userId, limit, cursor }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new AppError(400, "Limit must be between 1 and 100");

  const walletResult = await pool.query("SELECT id FROM wallets WHERE user_id = $1", [userId]);
  const wallet = walletResult.rows[0];
  if (!wallet) throw new AppError(400, "Wallet not found");

  const values = [wallet.id];
  let cursorClause = "";
  if (cursor) {
    values.push(decodeCursor(cursor));
    cursorClause = `AND id < $${values.length}`;
  }
  values.push(limit + 1);
  const rowsResult = await pool.query(
    `SELECT id, sender_wallet_id, receiver_wallet_id, amount_paise, status, created_at
     FROM transactions
     WHERE (sender_wallet_id = $1 OR receiver_wallet_id = $1) ${cursorClause}
     ORDER BY id DESC LIMIT $${values.length}`,
    values
  );
  const rows = rowsResult.rows;
  const hasNext = rows.length > limit;
  const page = hasNext ? rows.slice(0, limit) : rows;

  return {
    data: page.map((tx) => ({
      id: tx.id,
      amount: toRupees(tx.amount_paise),
      type: Number(tx.sender_wallet_id) === Number(wallet.id) ? "DEBIT" : "CREDIT",
      status: tx.status,
      created_at: tx.created_at,
    })),
    next_cursor: hasNext ? encodeCursor(page[page.length - 1].id) : null,
  };
}

module.exports = { transferMoney, getTransactionHistory };
