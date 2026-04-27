const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// =====================
// MODELS
// =====================
const VoucherSchema = new mongoose.Schema({
  code: String,
  expiry: Date,
  used: { type: Boolean, default: false }
});

const PaymentSchema = new mongoose.Schema({
  phone: String,
  amount: String,
  code: String,
  created: { type: Date, default: Date.now }
});

const Voucher = mongoose.model("Voucher", VoucherSchema);
const Payment = mongoose.model("Payment", PaymentSchema);

// =====================
// PLANS
// =====================
const plans = {
  "500": 3 * 60 * 60 * 1000,
  "1000": 24 * 60 * 60 * 1000,
  "2500": 3 * 24 * 60 * 60 * 1000,
  "4000": 7 * 24 * 60 * 60 * 1000
};

// =====================
// PORTAL
// =====================
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>XOUNNET</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body {
        font-family: Arial;
        text-align: center;
        background: linear-gradient(#0f2027,#203a43,#2c5364);
        color: white;
      }
      .box {
        margin: 20px;
        padding: 20px;
        background: rgba(255,255,255,0.1);
        border-radius: 10px;
      }
      input, button {
        padding: 12px;
        margin: 8px;
        width: 80%;
        border-radius: 5px;
        border: none;
      }
      button { background: #00c853; color: white; }
      .plan { background: #ff9800; }
    </style>
  </head>

  <body>

    <h1>XOUNNET</h1>
    <p>Built for connection</p>

    <div class="box">
      <h3>Pay Airtel Money</h3>
      <p>Merchant Code: <b>4404970</b></p>

      <input id="phone" placeholder="Phone Number"><br>

      <button class="plan" onclick="pay('500')">3 Hours - 500</button>
      <button class="plan" onclick="pay('1000')">24 Hours - 1000</button>
      <button class="plan" onclick="pay('2500')">3 Days - 2500</button>
      <button class="plan" onclick="pay('4000')">7 Days - 4000</button>
    </div>

    <div class="box">
      <h3>Your Voucher</h3>
      <p id="voucher"></p>
    </div>

    <div class="box">
      <h3>Enter Voucher</h3>
      <input id="code" placeholder="Voucher Code"><br>
      <button onclick="redeem()">Connect</button>
    </div>

    <p id="msg"></p>

    <script>
      const API = window.location.origin;

      function pay(amount) {
        fetch(API + "/pay", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            phone: phone.value,
            amount: amount
          })
        })
        .then(r=>r.json())
        .then(d=>{
          voucher.innerText = d.code;
          msg.innerText = "Payment recorded. Use voucher.";
        });
      }

      function redeem() {
        fetch(API + "/redeem", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ code: code.value })
        })
        .then(r=>r.json())
        .then(d=>msg.innerText=d.message);
      }
    </script>

  </body>
  </html>
  `);
});

// =====================
// PAY → GENERATE VOUCHER
// =====================
app.post("/pay", async (req, res) => {
  const { phone, amount } = req.body;

  const duration = plans[amount];
  if (!duration) return res.json({ message: "Invalid plan" });

  const code = Math.random().toString(36).substring(2,8).toUpperCase();
  const expiry = new Date(Date.now() + duration);

  await new Voucher({ code, expiry }).save();
  await new Payment({ phone, amount, code }).save();

  res.json({ code });
});

// =====================
// REDEEM
// =====================
app.post("/redeem", async (req, res) => {
  const { code } = req.body;

  const voucher = await Voucher.findOne({ code });

  if (!voucher) return res.json({ message: "Invalid code" });
  if (voucher.used) return res.json({ message: "Already used" });
  if (new Date() > voucher.expiry)
    return res.json({ message: "Expired" });

  voucher.used = true;
  await voucher.save();

  res.json({ message: "Access granted 🚀" });
});

// =====================
app.listen(process.env.PORT || 3000);
