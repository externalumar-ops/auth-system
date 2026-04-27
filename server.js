const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// =====================
// DATABASE CONNECTION
// =====================
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// =====================
// USER MODEL
// =====================
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  paid: {
    type: Boolean,
    default: false
  }
});

const User = mongoose.model("User", UserSchema);

// =====================
// PORTAL PAGE (INLINE)
// =====================
app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>XTANO WiFi</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        margin: 0;
        font-family: Arial;
        background: linear-gradient(120deg, #1e3c72, #2a5298);
        color: white;
        text-align: center;
      }
      .box {
        margin-top: 100px;
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
        background: #00c853;
        border: none;
        color: white;
        font-size: 16px;
        margin-top: 10px;
        border-radius: 5px;
      }
      .pay {
        background: #ff9800;
      }
      .card {
        background: rgba(255,255,255,0.1);
        padding: 20px;
        margin: 20px;
        border-radius: 10px;
      }
    </style>
  </head>
  <body>

    <div class="box">
      <h1>XTANO WiFi Portal</h1>
      <p>Login or Pay to Access Internet</p>

      <div class="card">
        <input type="text" id="username" placeholder="Username"><br>
        <input type="password" id="password" placeholder="Password"><br>

        <button onclick="register()">Register</button>
        <button onclick="login()">Login</button>
      </div>

      <div class="card">
        <button class="pay" onclick="pay()">Pay & Get Access</button>
      </div>

      <p id="msg"></p>
    </div>

  <script>
    const API = window.location.origin;

    function register() {
      fetch(API + "/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          username: username.value,
          password: password.value
        })
      })
      .then(r => r.json())
      .then(d => msg.innerText = d.message);
    }

    function login() {
      fetch(API + "/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          username: username.value,
          password: password.value
        })
      })
      .then(r => r.json())
      .then(d => msg.innerText = d.message + " | Paid: " + d.paid);
    }

    function pay() {
      fetch(API + "/pay", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          username: username.value
        })
      })
      .then(r => r.json())
      .then(d => msg.innerText = d.message);
    }
  </script>

  </body>
  </html>
  `);
});

// =====================
// API ROUTES
// =====================

// HEALTH
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// REGISTER
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const existing = await User.findOne({ username });
  if (existing) return res.json({ message: "User exists" });

  const hashed = await bcrypt.hash(password, 10);

  const user = new User({ username, password: hashed });
  await user.save();

  res.json({ message: "Registered successfully" });
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ message: "Wrong password" });

  const token = jwt.sign({ id: user._id }, "secretkey");

  res.json({
    message: "Login success",
    token,
    paid: user.paid
  });
});

// PAY
app.post("/pay", async (req, res) => {
  const { username } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.json({ message: "User not found" });

  user.paid = true;
  await user.save();

  res.json({ message: "Payment successful. You now have access." });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
