require("dotenv").config();

const required = ["DATABASE_URL", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} environment variable is required`);
}

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE_MINUTES: parseInt(process.env.JWT_EXPIRE_MINUTES || "30", 10),
  PORT: parseInt(process.env.PORT || "8000", 10),
  INITIAL_BALANCE_INR: Number(process.env.INITIAL_BALANCE_INR || 10000),
  PG_POOL_MAX: parseInt(process.env.PG_POOL_MAX || "20", 10),
  PG_SSL: process.env.PG_SSL === "true",
};
