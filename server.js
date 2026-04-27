const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// ======================
// MongoDB CONNECT
// ======================
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// ======================
// USER MODEL
// ======================
const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});

const User = mongoose.model("User", UserSchema);

// ======================
// ROUTES
// ======================

app.get("/", (req, res) => {
  res.send("Auth System Running 🚀");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// REGISTER
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

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

  const token = jwt.sign({ id: user._id }, "secretkey");

  res.json({ message: "Login success", token });
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
