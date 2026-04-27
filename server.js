const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ================= DB =================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("DB CONNECTED"))
  .catch(err => console.log("DB ERROR", err));

// ================= MODEL =================
const VoucherSchema = new mongoose.Schema({
  code: String,
  phone: String,
  used: { type: Boolean, default: false },
  expiry: Date
});

const Voucher = mongoose.model("Voucher", VoucherSchema);

// ================= TEST ROUTE =================
app.get("/", (req, res) => {
  res.send("XOUNNET WORKING ✔");
});

// ================= CREATE =================
app.post("/create", async (req, res) => {
  const { phone } = req.body;

  const code = "VCH-" + Math.random().toString(36).substring(2, 7).toUpperCase();

  await Voucher.create({
    code,
    phone,
    expiry: new Date(Date.now() + 3 * 60 * 60 * 1000)
  });

  res.json({ code });
});

// ================= REDEEM =================
app.post("/redeem", async (req, res) => {
  const { code } = req.body;

  const v = await Voucher.findOne({ code });

  if (!v) return res.json({ message: "INVALID" });
  if (v.used) return res.json({ message: "USED" });

  v.used = true;
  await v.save();

  res.json({ message: "ACCESS GRANTED" });
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("SERVER LIVE");
});
