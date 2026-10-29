const { connectDB } = require("./src/config/db");
const app = require("./src/app");
const { PORT } = require("./src/config/env");

connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
