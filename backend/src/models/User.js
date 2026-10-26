const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    _id: { type: Number }, // integer id (SQL wale id jaisa)
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("User", userSchema);
