const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");

router.post("/signup", asyncHandler(async (req, res) => {
  await authService.signup(req.body || {});
  res.json({ message: "User created successfully" });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const token = await authService.login(req.body || {});
  res.json({ access_token: token, token_type: "bearer" });
}));

module.exports = router;
