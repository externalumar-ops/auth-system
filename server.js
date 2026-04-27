const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ===================== DB =====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("DB Connected"))
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

// ===================== FRONTEND =====================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>XOUNNET</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
body{font-family:Arial;background:#0f2027;color:white;text-align:center}
.box{max-width:420px;margin:auto;padding:20px}
.card{background:rgba(255,255,255,0.1);padding:15px;margin:10px;border-radius:10px}
button{width:100%;padding:12px;margin:6px;border:none;border-radius:8px;background:#00c853;color:white}
input{width:90%;padding:12px;margin:6px;border-radius:8px;border:none;text-align:center}
.plan{background:#ff9800}
</style>
</head>

<body>

<div class="box">

<h2>XOUNNET</h2>
<p>Built for connection</p>

<!-- PAGE 1 -->
<div id="page1">

  <div class="card">
    <h3>Select Package</h3>

    <button class="plan" onclick="setPlan(500)">3 Hours - 500</button>
    <button class="plan" onclick="setPlan(1000)">24 Hours - 1000</button>
    <button class="plan" onclick="setPlan(2500)">3 Days - 2500</button>
    <button class="plan" onclick="setPlan(4000)">7 Days - 4000</button>
  </div>

  <div class="card">
    <h3>Payment Instructions</h3>
    <p>Send to Airtel / MTN: <b>4404970</b></p>

    <input id="phone" placeholder="Phone used to pay">

    <button onclick="generate()">Confirm Payment</button>
  </div>

  <div class="card">
    <h3>Enter Voucher</h3>
    <input id="voucherInput" placeholder="Voucher code">
    <button onclick="redeem()">Connect</button>
  </div>

</div>

<!-- PAGE 2 -->
<div id="page2" style="display:none">

  <div class="card">
    <h3>Your Voucher</h3>
    <h2 id="voucherText"></h2>

    <button onclick="back()">Back to Login</button>
  </div>

</div>

<p id="msg"></p>

</div>

<script>

let selectedAmount = 500;

// select plan
function setPlan(a){
  selectedAmount = a;
}

// create voucher → go to page 2
function generate(){
  fetch("/create",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      amount:selectedAmount,
      phone:document.getElementById("phone").value
    })
  })
  .then(r=>r.json())
  .then(d=>{

    document.getElementById("page1").style.display="none";
    document.getElementById("page2").style.display="block";

    document.getElementById("voucherText").innerText = d.code;
  });
}

// back to page 1
function back(){
  document.getElementById("page2").style.display="none";
  document.getElementById("page1").style.display="block";
}

// redeem voucher
function redeem(){
  fetch("/redeem",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      code:document.getElementById("voucherInput").value
    })
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

// ===================== CREATE VOUCHER =====================
app.post("/create", async (req, res) => {
  const { phone, amount } = req.body;

  const duration = plans[amount] || plans[500];

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  await Voucher.create({
    code,
    phone,
    amount,
    expiry: new Date(Date.now() + duration)
  });

  res.json({ code });
});

// ===================== REDEEM =====================
app.post("/redeem", async (req, res) => {
  const { code } = req.body;

  const v = await Voucher.findOne({ code });

  if (!v) return res.json({ message: "Invalid voucher" });
  if (v.used) return res.json({ message: "Already used" });
  if (new Date() > v.expiry) return res.json({ message: "Expired" });

  v.used = true;
  await v.save();

  res.json({ message: "Access granted 🚀" });
});

// =====================
app.listen(process.env.PORT || 3000, () =>
  console.log("XOUNNET FINAL FLOW RUNNING")
);
