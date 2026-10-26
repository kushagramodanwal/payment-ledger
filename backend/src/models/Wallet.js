const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    _id: { type: Number }, // wallet_id
    userId: { type: Number, ref: "User", required: true, unique: true }, // 1 user = 1 wallet
    name: { type: String, required: true, default: "My Wallet", maxlength: 100 },
    // Paise mein INTEGER. Float kabhi nahi (0.1 + 0.2 problem).
    // min: 0 => balance negative nahi ho sakta (safety net)
    balancePaise: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
