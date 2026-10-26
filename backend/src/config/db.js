// database.py ka equivalent
const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");

module.exports = async function connectDB() {
  await mongoose.connect(MONGO_URI, { maxPoolSize: 20 });
  console.log("MongoDB connected");
};
