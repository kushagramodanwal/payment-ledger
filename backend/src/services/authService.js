const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const AppError = require("../utils/AppError");
const { nextId } = require("../utils/ids");
const { toPaise } = require("../utils/money");
const { JWT_SECRET, JWT_EXPIRE_MINUTES, INITIAL_BALANCE_INR } = require("../config/env");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignup({ name, email, password }) {
  if (typeof name !== "string" || name.trim().length < 2)
    throw new AppError(400, "Name must be at least 2 characters long");
  if (typeof email !== "string" || !EMAIL_RE.test(email))
    throw new AppError(400, "Invalid email");
  if (typeof password !== "string" || password.length < 8)
    throw new AppError(400, "Password must be at least 8 characters long");
  if (Buffer.byteLength(password) > 72)
    throw new AppError(400, "Password cannot exceed 72 bytes (bcrypt limitation)");
}

// User + Wallet ek saath banao (atomic): ek fail to dono cancel
async function signup({ name, email, password }) {
  validateSignup({ name, email, password });
  name = name.trim();
  email = email.toLowerCase().trim();

  if (await User.findOne({ email })) throw new AppError(400, "User already exists");

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = await nextId("users");
  const walletId = await nextId("wallets");

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await User.create([{ _id: userId, name, email, passwordHash }], { session });
      await Wallet.create(
        [{
          _id: walletId,
          userId,
          name: `${name}'s Wallet`,
          balancePaise: toPaise(INITIAL_BALANCE_INR),
        }],
        { session }
      );
    });
  } catch (e) {
    if (e.code === 11000) throw new AppError(400, "User already exists"); // do signup ek saath
    throw e;
  } finally {
    await session.endSession();
  }
}

async function login({ email, password }) {
  const user = typeof email === "string" ? await User.findOne({ email: email.toLowerCase().trim() }) : null;
  const ok = user && typeof password === "string" && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new AppError(401, "Invalid credentials");

  return jwt.sign({ sub: String(user._id) }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: `${JWT_EXPIRE_MINUTES}m`,
  });
}

module.exports = { signup, login };
