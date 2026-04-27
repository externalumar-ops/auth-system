const express = require("express");
const app = express();

app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("Auth System is running");
});

// Health check (Render uses this often)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Temporary in-memory users
let users = [];

// Register
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing data" });
  }

  users.push({ username, password });
  res.json({ message: "User registered" });
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid login" });
  }

  res.json({ message: "Login successful" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
