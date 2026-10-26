// idempotency.py ka equivalent (middleware)
const AppError = require("./AppError");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = function requireIdempotencyKey(req, res, next) {
  const key = req.get("Idempotency-Key");
  if (!key) return next(new AppError(400, "Idempotency-Key header is required"));
  if (!UUID_RE.test(key)) return next(new AppError(400, "Idempotency-Key must be a valid UUID"));
  req.idempotencyKey = key;
  next();
};
