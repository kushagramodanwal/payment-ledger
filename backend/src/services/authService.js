const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { pool, withTransaction } = require("../config/db");
const AppError = require("../utils/AppError");
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

// Create the user and wallet in one PostgreSQL transaction.
async function signup({ name, email, password }) {
  validateSignup({ name, email, password });
  name = name.trim();
  email = email.toLowerCase().trim();

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await withTransaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [name, email, passwordHash]
      );
      const userId = userResult.rows[0].id;
      await client.query(
        `INSERT INTO wallets (user_id, name, balance_paise)
         VALUES ($1, $2, $3)`,
        [userId, `${name}'s Wallet`, toPaise(INITIAL_BALANCE_INR)]
      );
    });
  } catch (error) {
    if (error.code === "23505" && error.constraint === "users_email_key")
      throw new AppError(400, "User already exists");
    throw error;
  }
}

async function login({ email, password }) {
  const result = typeof email === "string"
    ? await pool.query(
        "SELECT id, password_hash FROM users WHERE email = $1",
        [email.toLowerCase().trim()]
      )
    : { rows: [] };
  const user = result.rows[0];
  const ok = user && typeof password === "string" && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new AppError(401, "Invalid credentials");

  return jwt.sign({ sub: String(user.id) }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: `${JWT_EXPIRE_MINUTES}m`,
  });
}

module.exports = { signup, login };
