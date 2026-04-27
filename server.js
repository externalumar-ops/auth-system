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
// FRONTEND
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
      margin:0;
      font-family: Arial;
      background: linear-gradient(120deg,#0f2027,#203a43,#2c5364);
      color:white;
      text-align:center;
    }

    .box {
      max-width:400px;
      margin:auto;
      padding:20px;
    }

    .card {
      background: rgba(255,255,255,0.1);
      padding:15px;
      margin:15px 0;
      border-radius:10px;
    }

    button {
      width:100%;
      padding:12px;
      margin:6px 0;
      border:none;
      border-radius:8px;
      background:#00c853;
      color:white;
      font-size:15px;
    }

    .plan {
      background:#ff9800;
    }

    input {
      width:90%;
      padding:12px;
      border:none;
      border-radius:8px;
      margin:6px 0;
      text-align:center;
    }
  </style>
</head>

<body>

<div class="box">

  <h1>XOUNNET</h1>
  <p>Built for connection</p>

  <!-- STEP 1 -->
  <div class="card" id="step1">
    <h3>Select Package</h3>

    <button class="plan" onclick="select(500,'3 Hours')">3 Hours - 500</button>
    <button class="plan" onclick="select(1000,'24 Hours')">24 Hours - 1000</button>
    <button class="plan" onclick="select(2500,'3 Days')">3 Days - 2500</button>
    <button class="plan" onclick="select(4000,'7 Days')">7 Days - 4000</button>
  </div>

  <!-- STEP 2 -->
  <div class="card" id="step2" style="display:none">
    <h3>Payment</h3>
    <p>Send money to:</p>
    <b>Airtel / MTN: 4404970</b>

    <p id="planText"></p>

    <input id="phone" placeholder="Phone used to pay">

    <button onclick="createVoucher()">Confirm Payment</button>
  </div>

  <!-- STEP 3 -->
  <div class="card" id="step3" style="display:none">
    <h3>Your Voucher</h3>
    <p id="voucherText"></p>

    <input id="voucher" placeholder="Enter voucher">

    <button onclick="redeem()">Connect</button>
  </div>

  <p id="msg"></p>

</div>

<script>
let amount = 0;
let name = "";

function select(a,n){
  amount = a;
  name = n;

  document.getElementById("step1").style.display="none";
  document.getElementById("step2").style.display="block";

  document.getElementById("planText").innerText = n + " - " + a;
}

function createVoucher(){
  fetch("/create",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      amount: amount,
      phone: document.getElementById("phone").value
    })
  })
  .then(r=>r.json())
  .then(d=>{
    document.getElementById("step2").style.display="none";
    document.getElementById("step3").style.display="block";

    document.getElementById("voucherText").innerText = d.code;
    msg.innerText = "Voucher created";
  });
}

function redeem(){
  fetch("/redeem",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({code: voucher.value})
  })
  .then(r=>r.json())
  .then(d=>{
    msg.innerText = d.message;
  });
}
</script>

</body>
</html>
  `);
});

// =====================
// CREATE VOUCHER
// =====================
app.post("/create", async (req, res) => {
  const { amount, phone } = req.body;

  const duration = plans[amount];
  if (!duration) return res.json({ message: "Invalid plan" });

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  await Voucher.create({
    code,
    phone,
    amount,
    expiry: new Date(Date.now() + duration)
  });

  res.json({ code });
});

// =====================
// REDEEM
// =====================
app.post("/redeem", async (req, res) => {
  const { code } = req.body;

  const voucher = await Voucher.findOne({ code });

  if (!voucher) return res.json({ message: "Invalid voucher" });
  if (voucher.used) return res.json({ message: "Already used" });
  if (new Date() > voucher.expiry)
    return res.json({ message: "Expired" });

  voucher.used = true;
  await voucher.save();

  res.json({ message: "Access granted 🚀" });
});

// =====================
app.listen(process.env.PORT || 3000, () =>
  console.log("XOUNNET running")
);
