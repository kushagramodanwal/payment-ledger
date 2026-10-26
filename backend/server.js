const { PORT } = require("./src/config/env");
const connectDB = require("./src/config/db");
const app = require("./src/app");

// Unique indexes ke bina idempotency/duplicate-email safety kaam nahi karti,
// isliye DB connect ke baad indexes ban jaane tak wait karte hain.
const User = require("./src/models/User");
const Wallet = require("./src/models/Wallet");
const Transaction = require("./src/models/Transaction");

connectDB()
  .then(() => Promise.all([User.init(), Wallet.init(), Transaction.init()]))
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("Startup failed:", err.message);
    process.exit(1);
  });
