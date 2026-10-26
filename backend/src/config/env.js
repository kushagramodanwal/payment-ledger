require("dotenv").config();

const required = ["MONGO_URI", "JWT_SECRET"];
for (const k of required) {
  if (!process.env[k]) throw new Error(`${k} environment variable is required`);
}

module.exports = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE_MINUTES: parseInt(process.env.JWT_EXPIRE_MINUTES || "30", 10),
  PORT: parseInt(process.env.PORT || "8000", 10),
  INITIAL_BALANCE_INR: Number(process.env.INITIAL_BALANCE_INR || 10000),
};
