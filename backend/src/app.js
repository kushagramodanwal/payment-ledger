// main.py ka equivalent
const express = require("express");
const cors = require("cors");

const errorHandler = require("./middleware/errorHandler");

const app = express();
   const origins = (
     process.env.CORS_ORIGINS ||
     "http://localhost:5173,http://localhost:5174,http://localhost:5175"
   ).split(",");

   app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

app.get("/health", (req, res) =>
  res.json({ status: "healthy", version: "4.0.0", currency: "INR" })
);

app.use("/auth", require("./routes/auth"));
app.use("/wallet", require("./routes/wallet"));
app.use("/transactions", require("./routes/transactions"));

app.use((req, res) => res.status(404).json({ detail: "Not found" }));
app.use(errorHandler);

module.exports = app;
