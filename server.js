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
// ROUTES
// =====================

// Home
app.get("/", (req, res) => {
  res.send("Auth + Payment System Running 🚀");
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// REGISTER
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ message: "User exists" });

  const hashed = await bcrypt.hash(password, 10);

  const user = new User({ username, password: hashed });
  await user.save();

  res.json({ message: "User registered" });
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Wrong password" });

  const token = jwt.sign(
    { id: user._id },
    "secretkey"
  );

  res.json({
    message: "Login success",
    token,
    paid: user.paid
  });
});

// SIMULATED PAYMENT
app.post("/pay", async (req, res) => {
  const { username } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.paid = true;
  await user.save();

  res.json({ message: "Payment successful, access unlocked" });
});

// PROTECTED ROUTE
app.get("/portal", async (req, res) => {
  const { username } = req.query;

  const user = await User.findOne({ username });

  if (!user || !user.paid) {
    return res.status(403).json({ message: "Payment required" });
  }

  res.send("Welcome to premium access 🚀");
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
