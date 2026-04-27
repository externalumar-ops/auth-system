const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// =====================
// DB
// =====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("DB Connected"))
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
// PRICE PLAN MAP
// =====================
const plans = {
  500: 3 * 60 * 60 * 1000,
  1000: 24 * 60 * 60 * 1000,
  2500: 3 * 24 * 60 * 60 * 1000,
  4000: 7 * 24 * 60 * 60 * 1000
};

// =====================
// UTILITY: CLEAN PHONE
// =====================
function normalizePhone(phone) {
  if (!phone) return "";
  return phone.replace(/\s/g, "");
}

// =====================
// MAIN SMS PAYMENT VERIFICATION
// =====================
// EXPECTED SMS FORMAT (from MTN/AIRTEL):
// "You have sent UGX 500 to 4404970. Ref: ABC123. Phone: 2567XXXXXXX"
app.post("/sms-webhook", async (req, res) => {
  const { message } = req.body;

  if (!message) return res.json({ status: "no message" });

  const text = message.toLowerCase();

  // detect merchant code
  if (!text.includes("4404970")) {
    return res.json({ status: "ignored - wrong merchant" });
  }

  // extract amount
  let amount = 0;
  if (text.includes("500")) amount = 500;
  if (text.includes("1000")) amount = 1000;
  if (text.includes("2500")) amount = 2500;
  if (text.includes("4000")) amount = 4000;

  if (!amount) {
    return res.json({ status: "invalid amount" });
  }

  // extract phone number (basic pattern)
  const phoneMatch = message.match(/256\d{8}/);
  const phone = phoneMatch ? normalizePhone(phoneMatch[0]) : "unknown";

  // generate voucher
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiry = new Date(Date.now() + plans[amount]);

  await Voucher.create({
    code,
    phone,
    amount,
    expiry
  });

  res.json({
    status: "voucher issued",
    code,
    amount,
    phone
  });
});

// =====================
// VERIFY VOUCHER
// =====================
app.post("/redeem", async (req, res) => {
  const { code } = req.body;

  const voucher = await Voucher.findOne({ code });

  if (!voucher) return res.json({ message: "Invalid voucher" });
  if (voucher.used) return res.json({ message: "Already used" });
  if (new Date() > voucher.expiry) return res.json({ message: "Expired voucher" });

  voucher.used = true;
  await voucher.save();

  res.json({
    message: "Access granted",
    plan: voucher.amount
  });
});

// =====================
// ADMIN CHECK PAYMENTS
// =====================
app.get("/admin/vouchers", async (req, res) => {
  const all = await Voucher.find().sort({ _id: -1 });
  res.json(all);
});

// =====================
// PORTAL (OPTIONAL SIMPLE UI)
// =====================
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="font-family:Arial;text-align:center;background:#111;color:#fff;padding:30px">

    <h1>XOUNNET</h1>
    <p>Built for connection</p>

    <input id="code" placeholder="Enter Voucher Code" style="padding:10px;width:80%"><br><br>

    <button onclick="redeem()" style="padding:10px;width:85%">Connect</button>

    <p id="msg"></p>

    <script>
      function redeem(){
        fetch("/redeem",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({code:code.value})
        })
        .then(r=>r.json())
        .then(d=>msg.innerText=d.message)
      }
    </script>

  </body>
  </html>
  `);
});

// =====================
app.listen(process.env.PORT || 3000);
