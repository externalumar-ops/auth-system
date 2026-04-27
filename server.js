const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// =====================
// DATABASE
// =====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// =====================
// VOUCHER MODEL
// =====================
const VoucherSchema = new mongoose.Schema({
  code: String,
  expiry: Date,
  used: {
    type: Boolean,
    default: false
  }
});

const Voucher = mongoose.model("Voucher", VoucherSchema);

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
  <!DOCTYPE html>
  <html>
  <head>
    <title>XOUNNET</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        margin: 0;
        font-family: Arial;
        background: linear-gradient(120deg, #0f2027, #203a43, #2c5364);
        color: white;
        text-align: center;
      }

      h1 {
        margin-top: 40px;
      }

      .slogan {
        opacity: 0.8;
        margin-bottom: 20px;
      }

      .card {
        background: rgba(255,255,255,0.1);
        margin: 20px;
        padding: 20px;
        border-radius: 10px;
      }

      input {
        padding: 12px;
        margin: 8px;
        width: 80%;
        border: none;
        border-radius: 5px;
      }

      button {
        padding: 12px;
        width: 85%;
        border: none;
        border-radius: 5px;
        margin-top: 10px;
        font-size: 15px;
        color: white;
        background: #00c853;
      }

      .plan {
        background: #ff9800;
      }

      .plans button {
        margin: 6px;
        width: 80%;
      }
    </style>
  </head>

  <body>

    <h1>XOUNNET</h1>
    <div class="slogan">Built for connection</div>

    <div class="card">
      <input id="code" placeholder="Enter Voucher Code"><br>
      <button onclick="redeem()">Connect</button>
    </div>

    <div class="card plans">
      <h3>Buy Plan</h3>
      <button class="plan">3 Hours - UGX 500</button>
      <button class="plan">24 Hours - UGX 1000</button>
      <button class="plan">3 Days - UGX 2500</button>
      <button class="plan">7 Days - UGX 4000</button>
    </div>

    <p id="msg"></p>

    <script>
      const API = window.location.origin;

      function redeem() {
        fetch(API + "/redeem", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            code: code.value
          })
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
// REDEEM VOUCHER
// =====================
app.post("/redeem", async (req, res) => {
  const { code } = req.body;

  const voucher = await Voucher.findOne({ code });

  if (!voucher)
    return res.json({ message: "Invalid code" });

  if (voucher.used)
    return res.json({ message: "Voucher already used" });

  if (voucher.expiry && new Date() > voucher.expiry)
    return res.json({ message: "Voucher expired" });

  voucher.used = true;
  await voucher.save();

  res.json({ message: "Access granted 🚀" });
});

// =====================
// ADMIN: CREATE VOUCHER
// =====================
app.get("/generate/:amount", async (req, res) => {
  const amount = req.params.amount;

  const duration = plans[amount];
  if (!duration) return res.json({ message: "Invalid plan" });

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const expiry = new Date(Date.now() + duration);

  await new Voucher({ code, expiry }).save();

  res.json({
    code,
    expires: expiry
  });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running"));
