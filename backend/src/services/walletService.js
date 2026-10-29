const { pool } = require("../config/db");
const AppError = require("../utils/AppError");
const { toRupees } = require("../utils/money");

const format = (wallet) => ({
  wallet_id: wallet.id,
  name: wallet.name,
  balance: toRupees(wallet.balance_paise),
});

async function getWallet(userId) {
  const result = await pool.query(
    "SELECT id, name, balance_paise FROM wallets WHERE user_id = $1",
    [userId]
  );
  if (!result.rows[0]) throw new AppError(404, "Wallet not found");
  return format(result.rows[0]);
}

async function updateWalletName(userId, name) {
  if (typeof name !== "string") throw new AppError(400, "Wallet name is required");
  name = name.trim();
  if (name.length < 2) throw new AppError(400, "Wallet name must be at least 2 characters");
  if (name.length > 100) throw new AppError(400, "Wallet name cannot exceed 100 characters");

  const result = await pool.query(
    `UPDATE wallets SET name = $1, updated_at = NOW()
     WHERE user_id = $2
     RETURNING id, name, balance_paise`,
    [name, userId]
  );
  if (!result.rows[0]) throw new AppError(404, "Wallet not found");
  return format(result.rows[0]);
}

module.exports = { getWallet, updateWalletName };
