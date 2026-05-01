import User from "../models/User.js";

export async function createUser(req, res) {
  const { username, walletAddress, gender } = req.body;

  if (!username || !walletAddress || !gender) {
    return res.status(400).json({ error: "username, walletAddress, and gender are required" });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const user = await User.create({ username, walletAddress, gender });
  res.status(201).json(user);
}

export async function getUser(req, res) {
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
}
