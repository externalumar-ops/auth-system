const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");

const app = express();
app.use(express.json());

// =====================
// DATABASE
// =====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// =====================
// MICROTIK CONFIG
// =====================
const MIKROTIK = {
  host: "http://192.168.88.1",
  user: "admin",
  pass: "admin"
};

// =====================
// PLANS (XOUNNET)
// =====================
const plans = {
  500: 3 * 60 * 60 * 1000,
  1000: 24 * 60 * 60 * 1000,
  2500: 3 * 24 * 60 * 60 * 1000,
  4000: 7 * 24 * 60 * 60 * 1000
};

// =====================
// MODELS
// =====================
const SessionSchema = new mongoose.Schema({
  code: String,
  username: String,
  password: String,
  expiry: Date,
  active: { type: Boolean, default: false }
});

const Session = mongoose.model("Session", SessionSchema);

// =====================
// MICROTIK FUNCTIONS
// =====================
async function addHotspotUser(username, password, limit) {
  try {
    await axios.get(`${MIKROTIK.host}/rest/ip/hotspot/user/add`, {
      params: {
        name: username,
        password: password,
        "limit-uptime": limit
      },
      auth: {
        username: MIKROTIK.user,
        password: MIKROTIK.pass
      }
    });
  } catch (err) {
    console.log("MikroTik error:", err.message);
  }
}

async function removeHotspotUser(username) {
  try {
    await axios.get(`${MIKROTIK.host}/rest/ip/hotspot/user/remove`, {
      params: { name: username },
      auth: {
        username: MIKROTIK.user,
        password: MIKROTIK.pass
      }
    });
  } catch (err) {
    console.log("Remove error:", err.message);
  }
}

// =====================
// PORTAL UI
// =====================
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>XOUNNET</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Arial; background:#0f2027; color:white; text-align:center; }
      .box { margin:20px; padding:20px; background:rgba(255,255,255,0.1); border-radius:10px; }
      input, button { padding:12px; width:80%; margin:8px; border:none; border-radius:5px; }
      button { background:#00c853; color:white; }
      .plan { background:#ff9800; }
    </style>
  </head>
  <body>

    <h1>XOUNNET</h1>
    <p>Built for connection</p>

    <div class="box">
      <input id="code" placeholder="Enter Voucher Code"><br>
      <button onclick="redeem()">Connect</button>
    </div>

    <p id="msg"></p>

    <script>
      function redeem(){
        fetch("/redeem",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({code:code.value})
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
// REDEEM VOUCHER → MICROTIK LOGIN
// =====================
app.post("/redeem", async (req, res) => {
  const { code } = req.body;

  const session = await Session.findOne({ code });

  if (!session) return res.json({ message: "Invalid voucher" });
  if (session.active) return res.json({ message: "Already used" });
  if (new Date() > session.expiry) return res.json({ message: "Expired" });

  session.active = true;
  await session.save();

  const limit = "3h";

  await addHotspotUser(
    session.username,
    session.password,
    limit
  );

  res.json({
    message: "Access granted",
    login: {
      username: session.username,
      password: session.password
    }
  });
});

// =====================
// CREATE SESSION (FROM PAYMENT/SMS)
// =====================
app.post("/create", async (req, res) => {
  const { amount } = req.body;

  const duration = plans[amount];
  if (!duration) return res.json({ message: "Invalid plan" });

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const username = code;
  const password = code + "X";

  const expiry = new Date(Date.now() + duration);

  await Session.create({
    code,
    username,
    password,
    expiry
  });

  res.json({
    message: "Voucher created",
    code
  });
});

// =====================
// AUTO CLEAN EXPIRED SESSIONS
// =====================
setInterval(async () => {
  const now = new Date();

  const expired = await Session.find({
    expiry: { $lt: now },
    active: true
  });

  for (let s of expired) {
    await removeHotspotUser(s.username);
    s.active = false;
    await s.save();
  }

}, 60000);

// =====================
app.listen(process.env.PORT || 3000, () =>
  console.log("XOUNNET ISP SYSTEM RUNNING")
);
