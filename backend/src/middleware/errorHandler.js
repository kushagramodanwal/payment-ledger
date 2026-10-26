// Saare errors yahin aate hain. Response shape FastAPI jaisa: { detail: "..." }
module.exports = function errorHandler(err, req, res, next) {
  if (err.status) return res.status(err.status).json({ detail: err.detail });
  if (err.type === "entity.parse.failed") return res.status(400).json({ detail: "Invalid JSON" });
  console.error(err);
  res.status(500).json({ detail: "Internal server error" });
};
