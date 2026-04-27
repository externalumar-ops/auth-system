const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// =====================
// DB
// =====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// =====================
// VOUCHER MODEL
// =====================
const VoucherSchema = new mongoose.Schema({
  code: String,
  phone: String,
  amount: Number,
  expiry: Date,
  used: { type: Boolean, default: false }
});

const Voucher = mongoose.model("Voucher", VoucherSchema);

// =====================
// PLANS
// =====================
const plans = {
  500: 3 * 60 * 60 * 1000,
  1000: 24 * 60 * 60 * 1000,
  2500: 3 * 24 * 60 * 60 * 1000,
  4000: 7 * 24 * 60 * 60 * 1000
};

// =====================
// TRUSTED SMS INPUT (FROM FORWARDER)
// =====================
// Expected format from SMS forwarder:
// {
//   message: "PAID 500 4404970 2567XXXXXXX"
// }

app.post("/sms", async (req, res) => {
  const { message } = req.body;

  if (!message) return res.json({ status: "no message" });

  const text = message.toLowerCase();

  // MUST contain merchant code
  if (!text.includes("4404970")) {
    return res.json({ status: "ignored" });
  }

  // detect amount
  let amount = 0;
  if (text.includes("500")) amount = 500;
  if (text.includes("1000")) amount = 1000;
  if (text.includes("2500")) amount = 2500;
  if (text.includes("4000")) amount = 4000;

  if (!amount) {
    return res.json({ status: "invalid amount" });
  }

  // extract phone (256 format)
  const phoneMatch = message.match(/256\d{8}/);
  const phone = phoneMatch ? phoneMatch[0] : "unknown";

  // generate voucher
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  await Voucher.create({
    code,
    phone,
    amount,
    expiry: new Date(Date.now() + plans[amount])
  });

  return res.json({
    status: "voucher created",
    code,
    amount,
    phone
  });
});

// =====================
// REDEEM VOUCHER (HOTSPOT LOGIN ENTRY POINT)
// =====================
app.post("/redeem", async (req, res) => {
  const { code } = req.body;

  const voucher = await Voucher.findOne({ code });

  if (!voucher) return res.json({ message: "Invalid voucher" });
  if (voucher.used) return res.json({ message: "Already used" });
  if (new Date() > voucher.expiry)
    return res.json({ message: "Expired voucher" });

  voucher.used = true;
  await voucher.save();

  return res.json({
    message: "Access granted",
    plan: voucher.amount,
    user: voucher.phone
  });
});

// =====================
// ADMIN VIEW (OPTIONAL)
// =====================
app.get("/admin/vouchers", async (req, res) => {
  const all = await Voucher.find().sort({ _id: -1 });
  res.json(all);
});

// =====================
// SIMPLE STATUS CHECK
// =====================
app.get("/", (req, res) => {
  res.send("XOUNNET ISP SYSTEM ACTIVE");
});

// =====================
app.listen(process.env.PORT || 3000, () =>
  console.log("XOUNNET ISP READY")
);
