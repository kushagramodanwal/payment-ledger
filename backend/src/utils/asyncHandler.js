// async route mein error aaye to Express ke error handler tak pahunchao
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
