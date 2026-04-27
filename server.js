const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ===================== DB =====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ===================== MODEL =====================
const VoucherSchema = new mongoose.Schema({
  code: String,
  phone: String,
  amount: Number,
  expiry: Date,
  used: { type: Boolean, default: false }
});

const Voucher = mongoose.model("Voucher", VoucherSchema);

// ===================== PLANS =====================
const plans = {
  500: 3 * 60 * 60 * 1000,
  1000: 24 * 60 * 60 * 1000,
  2500: 3 * 24 * 60 * 60 * 1000,
  4000: 7 * 24 * 60 * 60 * 1000
};

// ===================== HEALTH CHECK =====================
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// ===================== CREATE VOUCHER =====================
app.post("/create", async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone) return res.json({ message: "Phone required" });

    const duration = plans[amount] || plans[500];

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    await Voucher.create({
      code,
      phone,
      amount: amount || 500,
      expiry: new Date(Date.now() + duration)
    });

    return res.json({ code });
  } catch (err) {
    console.log(err);
    return res.json({ message: "Server error" });
  }
});

// ===================== REDEEM VOUCHER =====================
app.post("/redeem", async (req, res) => {
  try {
    const { code } = req.body;

    const voucher = await Voucher.findOne({ code });

    if (!voucher) return res.json({ message: "Invalid voucher" });
    if (voucher.used) return res.json({ message: "Already used" });
    if (new Date() > voucher.expiry)
      return res.json({ message: "Expired voucher" });

    voucher.used = true;
    await voucher.save();

    return res.json({
      message: "Access granted 🚀",
      plan: voucher.amount
    });
  } catch (err) {
    console.log(err);
    return res.json({ message: "Server error" });
  }
});

// ===================== LIST (DEBUG) =====================
app.get("/vouchers", async (req, res) => {
  const all = await Voucher.find().sort({ _id: -1 });
  res.json(all);
});

// ===================== ROOT =====================
app.get("/", (req, res) => {
  res.send("XOUNNET BACKEND RUNNING ✔");
});

// =====================
app.listen(process.env.PORT || 3000, () =>
  console.log("XOUNNET SYSTEM RUNNING")
);
