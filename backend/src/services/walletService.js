const Wallet = require("../models/Wallet");
const AppError = require("../utils/AppError");
const { toRupees } = require("../utils/money");

const format = (w) => ({ wallet_id: w._id, name: w.name, balance: toRupees(w.balancePaise) });

async function getWallet(userId) {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw new AppError(404, "Wallet not found");
  return format(wallet);
}

async function updateWalletName(userId, name) {
  if (typeof name !== "string") throw new AppError(400, "Wallet name is required");
  name = name.trim();
  if (name.length < 2) throw new AppError(400, "Wallet name must be at least 2 characters");
  if (name.length > 100) throw new AppError(400, "Wallet name cannot exceed 100 characters");

  const wallet = await Wallet.findOneAndUpdate({ userId }, { name }, { new: true });
  if (!wallet) throw new AppError(404, "Wallet not found");
  return format(wallet);
}

module.exports = { getWallet, updateWalletName };
