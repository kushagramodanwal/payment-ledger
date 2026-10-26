const mongoose = require("mongoose");

const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");
const { nextId } = require("../utils/ids");
const { toPaise, toRupees } = require("../utils/money");
const { encodeCursor, decodeCursor } = require("../utils/pagination");

const MAX_AMOUNT_INR = 1000000; // 10 lakh

const result = (tx) => ({
  transaction_id: tx._id,
  status: tx.status,
  amount: toRupees(tx.amountPaise),
});

/**
 * Transfer flow (Python wale steps ka Mongo version):
 * 1. Validate
 * 2. Idempotency check (same key => purana result)
 * 3. Mongo transaction shuru
 * 4. Sender wallet se paise kaato: filter me "balance >= amount" => check + minus ek hi atomic step.
 *    (Python mein ye kaam SELECT ... FOR UPDATE row lock karta tha)
 * 5. Receiver ko paise jodo
 * 6. Transaction record likho
 * 7. Commit (error aaya to sab rollback)
 */
async function transferMoney({ senderUserId, receiverUserId, amount, idempotencyKey }) {
  // ---- 1. validate ----
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)
    throw new AppError(400, "Amount must be positive");
  if (amount > MAX_AMOUNT_INR) throw new AppError(400, "Amount cannot exceed ₹10,00,000");
  if (!Number.isInteger(receiverUserId)) throw new AppError(400, "receiver_user_id must be an integer");
  if (senderUserId === receiverUserId) throw new AppError(400, "Cannot transfer to yourself");

  const amountPaise = toPaise(amount);
  if (amountPaise <= 0) throw new AppError(400, "Amount must be positive");

  const [senderWallet, receiverWallet] = await Promise.all([
    Wallet.findOne({ userId: senderUserId }),
    Wallet.findOne({ userId: receiverUserId }),
  ]);
  if (!senderWallet) throw new AppError(400, "Sender wallet not found");
  if (!receiverWallet) throw new AppError(400, "Receiver wallet not found");

  // ---- 2. idempotency ----
  const existing = await Transaction.findOne({ idempotencyKey });
  if (existing) return replayExisting(existing, senderWallet._id, receiverWallet._id, amountPaise);

  const txId = await nextId("transactions"); // transaction ke bahar (counter par lock na bane)

  // ---- 3-7. atomic transfer ----
  const session = await mongoose.startSession();
  try {
    let created;
    await session.withTransaction(async () => {
      const debited = await Wallet.findOneAndUpdate(
        { _id: senderWallet._id, balancePaise: { $gte: amountPaise } },
        { $inc: { balancePaise: -amountPaise } },
        { session, new: true }
      );
      if (!debited) throw new AppError(400, "INSUFFICIENT_BALANCE");

      await Wallet.updateOne(
        { _id: receiverWallet._id },
        { $inc: { balancePaise: amountPaise } },
        { session }
      );

      [created] = await Transaction.create(
        [{
          _id: txId,
          idempotencyKey,
          senderWalletId: senderWallet._id,
          receiverWalletId: receiverWallet._id,
          amountPaise,
          status: "SUCCESS",
        }],
        { session }
      );
    });
    return result(created);
  } catch (e) {
    // Insufficient balance: audit trail ke liye FAILED record (Python jaisa), phir 400
    if (e instanceof AppError && e.detail === "INSUFFICIENT_BALANCE") {
      await recordFailed({ txId, idempotencyKey, senderWallet, receiverWallet, amountPaise });
      throw e;
    }
    // Race: do same-key requests ek saath aayi. Jo jeet gayi uska result do.
    if (e.code === 11000) {
      const winner = await Transaction.findOne({ idempotencyKey });
      if (winner) return replayExisting(winner, senderWallet._id, receiverWallet._id, amountPaise);
      throw new AppError(409, "IDEMPOTENCY_KEY_CONFLICT");
    }
    throw e;
  } finally {
    await session.endSession();
  }
}

function replayExisting(tx, senderWalletId, receiverWalletId, amountPaise) {
  // Same key + alag payload => conflict
  if (
    tx.senderWalletId !== senderWalletId ||
    tx.receiverWalletId !== receiverWalletId ||
    tx.amountPaise !== amountPaise
  ) {
    throw new AppError(409, "IDEMPOTENCY_KEY_CONFLICT");
  }
  // Pehle FAILED tha to dobara wahi error
  if (tx.status === "FAILED") throw new AppError(400, "INSUFFICIENT_BALANCE");
  return result(tx);
}

async function recordFailed({ txId, idempotencyKey, senderWallet, receiverWallet, amountPaise }) {
  try {
    await Transaction.create({
      _id: txId,
      idempotencyKey,
      senderWalletId: senderWallet._id,
      receiverWalletId: receiverWallet._id,
      amountPaise,
      status: "FAILED",
    });
  } catch (e) {
    if (e.code !== 11000) throw e; // duplicate key ho to koi baat nahi
  }
}

async function getTransactionHistory({ userId, limit, cursor }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new AppError(400, "Limit must be between 1 and 100");

  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw new AppError(400, "Wallet not found");

  const filter = { $or: [{ senderWalletId: wallet._id }, { receiverWalletId: wallet._id }] };
  if (cursor) filter._id = { $lt: decodeCursor(cursor) };

  // limit + 1 => ek extra laao taaki pata chale agla page hai ya nahi
  const rows = await Transaction.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
  const hasNext = rows.length > limit;
  const page = hasNext ? rows.slice(0, limit) : rows;

  return {
    data: page.map((tx) => ({
      id: tx._id,
      amount: toRupees(tx.amountPaise),
      type: tx.senderWalletId === wallet._id ? "DEBIT" : "CREDIT",
      status: tx.status,
      created_at: tx.createdAt,
    })),
    next_cursor: hasNext ? encodeCursor(page[page.length - 1]._id) : null,
  };
}

module.exports = { transferMoney, getTransactionHistory };
