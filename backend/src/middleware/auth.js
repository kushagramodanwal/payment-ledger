// deps.py ka get_current_user_id
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const AppError = require("../utils/AppError");

module.exports = function auth(req, res, next) {
  const header = req.get("Authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return next(new AppError(401, "Not authenticated"));

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    const userId = parseInt(payload.sub, 10);
    if (Number.isNaN(userId)) throw new Error();
    req.userId = userId;
    next();
  } catch (e) {
    const msg = e.name === "TokenExpiredError" ? "Token has expired - please login again" : "Invalid token";
    next(new AppError(401, msg));
  }
};
