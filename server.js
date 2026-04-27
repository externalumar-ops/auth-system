const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ================= DB =================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("DB CONNECTED"))
  .catch(err => console.log(err));

// ================= MODEL =================
const VoucherSchema = new mongoose.Schema({
  code: String,
  phone: String,
  amount: Number,
  used: { type: Boolean, default: false },
  expiry: Date
});

const Voucher = mongoose.model("Voucher", VoucherSchema);

// ================= PLANS =================
const plans = {
  500: 3 * 60 * 60 * 1000,
  1000: 24 * 60 * 60 * 1000,
  2500: 3 * 24 * 60 * 60 * 1000,
  4000: 7 * 24 * 60 * 60 * 1000
};

// ================= FRONTEND =================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>XOUNNET</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
body{
  margin:0;
  font-family:Arial;
  background:#0b1c26;
  color:white;
  height:100vh;
  overflow:hidden;
  display:flex;
  justify-content:center;
  align-items:center;
}

.container{
  width:92%;
  max-width:360px;
}

.card{
  background:rgba(255,255,255,0.08);
  padding:12px;
  margin:8px 0;
  border-radius:12px;
}

button{
  width:100%;
  padding:10px;
  margin:4px 0;
  border:none;
  border-radius:8px;
  background:#00c853;
  color:white;
}

.plan{
  background:#333;
}

.plan.active{
  background:#ff9800;
}

input{
  width:92%;
  padding:10px;
  margin:5px 0;
  border:none;
  border-radius:8px;
  text-align:center;
}

h2,h3,p{margin:5px 0}

#payBox{
  font-size:14px;
  line-height:1.4;
  color:#ddd;
}
</style>
</head>

<body>

<div class="container">

<h2 style="text-align:center">XOUNNET</h2>
<p style="text-align:center;font-size:12px">Built for connection</p>

<!-- PACKAGE -->
<div class="card">
<h3>Select Package</h3>

<button class="plan" onclick="select(500,this)">3 Hours - 500</button>
<button class="plan" onclick="select(1000,this)">24 Hours - 1000</button>
<button class="plan" onclick="select(2500,this)">3 Days - 2500</button>
<button class="plan" onclick="select(4000,this)">7 Days - 4000</button>
</div>

<!-- PAYMENT -->
<div class="card">
<h3>Payment Instructions</h3>

<div id="payBox">
Select a package to see instructions
</div>

<input id="phone" placeholder="Phone used to pay">

<button onclick="createVoucher()">Generate Voucher</button>
</div>

<!-- VOUCHER -->
<div class="card">
<h3>Enter Voucher</h3>

<input id="code" placeholder="Voucher code">
<button onclick="redeem()">Connect</button>
</div>

<p id="msg" style="text-align:center"></p>

</div>

<script>

let amount = 500;
let active = null;

// package select
function select(a,btn){
  amount = a;

  if(active) active.classList.remove("active");
  btn.classList.add("active");
  active = btn;

  document.getElementById("payBox").innerHTML =
    "Dial:<br><b>*185*9*4404970*" + a + "*REF*PIN#</b><br><br>" +
    "Confirm payment then enter phone number.";
}

// create voucher
function createVoucher(){
  fetch("/create",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      phone:document.getElementById("phone").value,
      amount:amount
    })
  })
  .then(r=>r.json())
  .then(d=>{
    msg.innerText = "Voucher: " + d.code;
  });
}

// redeem
function redeem(){
  fetch("/redeem",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      code:document.getElementById("code").value
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

// ================= CREATE =================
app.post("/create", async (req, res) => {
  const { phone, amount } = req.body;

  const code = "VCH-" + Math.random().toString(36).substring(2,7).toUpperCase();

  await Voucher.create({
    code,
    phone,
    amount,
    expiry: new Date(Date.now() + (plans[amount] || plans[500]))
  });

  res.json({ code });
});

// ================= REDEEM =================
app.post("/redeem", async (req, res) => {
  const { code } = req.body;

  const v = await Voucher.findOne({ code });

  if (!v) return res.json({ message: "INVALID VOUCHER" });
  if (v.used) return res.json({ message: "ALREADY USED" });
  if (new Date() > v.expiry) return res.json({ message: "EXPIRED" });

  v.used = true;
  await v.save();

  res.json({ message: "ACCESS GRANTED 🚀" });
});

// ================= START =================
app.listen(process.env.PORT || 3000, () =>
  console.log("XOUNNET CLEAN PORTAL RUNNING")
);
