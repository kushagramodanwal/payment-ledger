const connectDB = require("./src/config/db");
const app = require("./src/app");

const User = require("./src/models/User");
const Wallet = require("./src/models/Wallet");
const Transaction = require("./src/models/Transaction");

const PORT = process.env.PORT || require("./src/config/env").PORT || 8000;

connectDB()
  .then(() => Promise.all([User.init(), Wallet.init(), Transaction.init()]))
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
