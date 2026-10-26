const router = require("express").Router();
const auth = require("../middleware/auth");
const requireIdempotencyKey = require("../utils/idempotency");
const asyncHandler = require("../utils/asyncHandler");
const txService = require("../services/transactionService");

router.post("/transfer", auth, requireIdempotencyKey, asyncHandler(async (req, res) => {
  const { receiver_user_id, amount } = req.body || {};
  const out = await txService.transferMoney({
    senderUserId: req.userId,
    receiverUserId: receiver_user_id,
    amount,
    idempotencyKey: req.idempotencyKey,
  });
  res.json(out);
}));

router.get("/", auth, asyncHandler(async (req, res) => {
  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  res.json(await txService.getTransactionHistory({
    userId: req.userId,
    limit,
    cursor: req.query.cursor,
  }));
}));

module.exports = router;
