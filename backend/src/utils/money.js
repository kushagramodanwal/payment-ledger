// DB mein paise (integer), API mein rupees (frontend ko float chahiye)
const toPaise = (rupees) => Math.round(rupees * 100);
const toRupees = (paise) => paise / 100;
module.exports = { toPaise, toRupees };
