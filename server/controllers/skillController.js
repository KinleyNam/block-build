import User, { expToLevel } from "../models/User.js";

const VALID_SKILLS = ["carpentry", "blacksmithing", "magicResearch"];

function formatSkills(skills) {
  const result = {};
  for (const skill of VALID_SKILLS) {
    const exp = skills?.[skill]?.exp ?? 0;
    result[skill] = { exp, level: expToLevel(exp) };
  }
  return result;
}

export async function getSkills(req, res) {
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json(formatSkills(user.skills));
}

export async function addExp(req, res) {
  const { username, skill } = req.params;
  const { amount } = req.body;

  if (!VALID_SKILLS.includes(skill)) {
    return res.status(400).json({ error: `Invalid skill. Valid skills: ${VALID_SKILLS.join(", ")}` });
  }

  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  const user = await User.findOneAndUpdate(
    { username },
    { $inc: { [`skills.${skill}.exp`]: parsed } },
    { new: true }
  );

  if (!user) return res.status(404).json({ error: "User not found" });

  const exp = user.skills[skill].exp;
  res.json({ skill, exp, level: expToLevel(exp) });
}
