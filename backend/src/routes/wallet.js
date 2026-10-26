const router = require("express").Router();
const auth = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const walletService = require("../services/walletService");

router.get("/", auth, asyncHandler(async (req, res) => {
  res.json(await walletService.getWallet(req.userId));
}));

router.patch("/name", auth, asyncHandler(async (req, res) => {
  res.json(await walletService.updateWalletName(req.userId, (req.body || {}).name));
}));

module.exports = router;
