const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

// =====================
// DATABASE
// =====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// =====================
// USER MODEL
// =====================
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  expiry: Date
});

const User = mongoose.model("User", UserSchema);

// =====================
// TIME PLANS
// =====================
const plans = {
  "3h": 3 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000
};

// =====================
// HOME (PORTAL)
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
      <input id="username" placeholder="Username"><br>
      <input id="password" type="password" placeholder="Password"><br>

      <button onclick="register()">Register</button>
      <button onclick="login()">Login</button>
    </div>

    <div class="card plans">
      <h3>Select Plan</h3>

      <button class="plan" onclick="pay('3h')">3 Hours - UGX 500</button>
      <button class="plan" onclick="pay('24h')">24 Hours - UGX 1000</button>
      <button class="plan" onclick="pay('3d')">3 Days - UGX 2500</button>
      <button class="plan" onclick="pay('7d')">7 Days - UGX 4000</button>
    </div>

    <div class="card">
      <button onclick="check()">Check Access</button>
    </div>

    <p id="msg"></p>

    <script>
      const API = window.location.origin;

      function register() {
        fetch(API + "/register", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            username: username.value,
            password: password.value
          })
        }).then(r=>r.json()).then(d=>msg.innerText=d.message);
      }

      function login() {
        fetch(API + "/login", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            username: username.value,
            password: password.value
          })
        }).then(r=>r.json()).then(d=>msg.innerText=d.message);
      }

      function pay(plan) {
        fetch(API + "/pay", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({
            username: username.value,
            plan: plan
          })
        }).then(r=>r.json()).then(d=>msg.innerText=d.message);
      }

      function check() {
        fetch(API + "/check?username=" + username.value)
        .then(r=>r.json())
        .then(d=>msg.innerText=d.message);
      }
    </script>

  </body>
  </html>
  `);
});

// =====================
// REGISTER
// =====================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const existing = await User.findOne({ username });
  if (existing) return res.json({ message: "User exists" });

  const hash = await bcrypt.hash(password, 10);

  await new User({ username, password: hash }).save();

  res.json({ message: "Registered successfully" });
});

// =====================
// LOGIN
// =====================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.json({ message: "User not found" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.json({ message: "Wrong password" });

  res.json({ message: "Login success" });
});

// =====================
// PAY (SET EXPIRY)
// =====================
app.post("/pay", async (req, res) => {
  const { username, plan } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.json({ message: "User not found" });

  const duration = plans[plan];
  const now = new Date();

  user.expiry = new Date(now.getTime() + duration);
  await user.save();

  res.json({ message: "Plan activated" });
});

// =====================
// CHECK ACCESS
// =====================
app.get("/check", async (req, res) => {
  const user = await User.findOne({ username: req.query.username });

  if (!user || !user.expiry)
    return res.json({ message: "No active plan" });

  if (new Date() > user.expiry)
    return res.json({ message: "Plan expired" });

  res.json({ message: "Access granted" });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running"));
