// Mongo mein auto-increment id nahi hota. Frontend ko integer IDs chahiye
// (user ID, wallet_id, transaction_id), isliye counter collection use kar rahe hain.
const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: String, // "users" | "wallets" | "transactions"
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);
