import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  { exp: { type: Number, default: 0, min: 0 } },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 18,
    },
    walletAddress: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    skills: {
      carpentry:     { type: skillSchema, default: () => ({}) },
      blacksmithing: { type: skillSchema, default: () => ({}) },
      magicResearch: { type: skillSchema, default: () => ({}) },
    },
    lastScene: { type: String,  default: null },
    lastX:     { type: Number,  default: null },
    lastY:     { type: Number,  default: null },
    pvpWins:   { type: Number,  default: 0 },
    customization: {
      skinIndex:   { type: Number, default: 1,  min: 1, max: 5 },
      hairIndex:   { type: Number, default: 1,  min: 1, max: 25 },
      outfitIndex: { type: Number, default: 0,  min: 0, max: 4 },
      weaponTier:  { type: Number, default: 0,  min: 0, max: 4 },
      weaponType:  { type: Number, default: 0,  min: 0, max: 2 },
    },
  },
  { timestamps: true }
);

// Level formula: every 100 EXP = 1 level, starting at level 1
export function expToLevel(exp) {
  return Math.floor(exp / 100) + 1;
}

export default mongoose.model("User", userSchema);