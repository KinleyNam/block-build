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

  const user = await User.create({ username, walletAddress: walletAddress.toLowerCase(), gender });
  res.status(201).json(user);
}

export async function getUser(req, res) {
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
}

export async function getUserByWallet(req, res) {
  const user = await User.findOne({ walletAddress: req.params.address.toLowerCase() });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
}

export async function savePosition(req, res) {
  const { scene, x, y } = req.body;
  if (!scene || x == null || y == null) {
    return res.status(400).json({ error: "scene, x, and y are required" });
  }
  const user = await User.findOneAndUpdate(
    { username: req.params.username },
    { lastScene: scene, lastX: Math.round(x), lastY: Math.round(y) },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true });
}