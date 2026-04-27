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
// MODEL
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
// FRONTEND PORTAL
// =====================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>XOUNNET</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
body{font-family:Arial;background:#111;color:white;text-align:center}
.box{max-width:400px;margin:auto;padding:20px}
.card{background:#222;padding:15px;margin:10px;border-radius:10px}
button{width:100%;padding:12px;margin:5px;border:none;border-radius:8px;background:#00c853;color:white}
input{width:90%;padding:10px;margin:5px;border-radius:8px;border:none}
</style>
</head>

<body>
<div class="box">

<h2>XOUNNET</h2>
<p>Built for connection</p>

<div class="card" id="step1">
<h3>Select Plan</h3>

<button onclick="select(500)">3 Hours - 500</button>
<button onclick="select(1000)">24 Hours - 1000</button>
<button onclick="select(2500)">3 Days - 2500</button>
<button onclick="select(4000)">7 Days - 4000</button>

</div>

<div class="card" id="step2" style="display:none">
<h3>Payment</h3>
<p>Send to Airtel/MTN: <b>4404970</b></p>

<input id="phone" placeholder="Phone used to pay">

<button onclick="create()">Confirm Payment</button>
</div>

<div class="card" id="step3" style="display:none">
<h3>Your Voucher</h3>
<p id="voucher"></p>

<input id="code" placeholder="Enter voucher">

<button onclick="redeem()">Connect</button>
</div>

<p id="msg"></p>

</div>

<script>
let amount = 0;

function select(a){
 amount = a;
 document.getElementById("step1").style.display="none";
 document.getElementById("step2").style.display="block";
}

function create(){
 fetch("/create",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({
     amount:amount,
     phone:document.getElementById("phone").value
   })
 })
 .then(r=>r.json())
 .then(d=>{
   document.getElementById("step2").style.display="none";
   document.getElementById("step3").style.display="block";
   document.getElementById("voucher").innerText=d.code;
 });
}

function redeem(){
 fetch("/redeem",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({code:document.getElementById("code").value})
 })
 .then(r=>r.json())
 .then(d=>{
   msg.innerText=d.message;
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

  const code = Math.random().toString(36).substring(2,8).toUpperCase();

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

  const v = await Voucher.findOne({ code });

  if (!v) return res.json({ message: "Invalid voucher" });
  if (v.used) return res.json({ message: "Already used" });
  if (new Date() > v.expiry) return res.json({ message: "Expired" });

  v.used = true;
  await v.save();

  res.json({ message: "Access granted 🚀" });
});

// =====================
// SMS (FORWARDER READY)
// =====================
app.post("/sms", async (req, res) => {
  const { message } = req.body;

  if (!message.includes("4404970"))
    return res.json({ status: "ignored" });

  let amount = 0;
  if (message.includes("500")) amount = 500;
  if (message.includes("1000")) amount = 1000;
  if (message.includes("2500")) amount = 2500;
  if (message.includes("4000")) amount = 4000;

  const code = Math.random().toString(36).substring(2,8).toUpperCase();

  await Voucher.create({
    code,
    phone: "sms-user",
    amount,
    expiry: new Date(Date.now() + (plans[amount] || 0))
  });

  res.json({ code });
});

// =====================
app.listen(process.env.PORT || 3000, () =>
  console.log("XOUNNET FULL SYSTEM RUNNING")
);
