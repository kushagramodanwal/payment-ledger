// Cursor = base64(JSON). Transaction id time ke saath badhta hai, isliye id se hi order stable hai.
const AppError = require("./AppError");

function encodeCursor(id) {
  return Buffer.from(JSON.stringify({ id })).toString("base64");
}

function decodeCursor(cursor) {
  try {
    const { id } = JSON.parse(Buffer.from(cursor, "base64").toString());
    if (!Number.isInteger(id)) throw new Error();
    return id;
  } catch {
    throw new AppError(400, "Invalid cursor format");
  }
}

module.exports = { encodeCursor, decodeCursor };
