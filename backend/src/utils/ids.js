const Counter = require("../models/Counter");

// Atomic: do requests ek saath aaye tab bhi alag-alag id milegi
async function nextId(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

module.exports = { nextId };
