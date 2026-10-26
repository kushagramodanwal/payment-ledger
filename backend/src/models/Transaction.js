const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    _id: { type: Number }, // transaction_id
    idempotencyKey: { type: String, required: true, unique: true },
    senderWalletId: { type: Number, ref: "Wallet", required: true },
    receiverWalletId: { type: Number, ref: "Wallet", required: true },
    amountPaise: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// History queries ke liye (SQL ke idx_sender_created / idx_receiver_created jaise)
transactionSchema.index({ senderWalletId: 1, _id: -1 });
transactionSchema.index({ receiverWalletId: 1, _id: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
