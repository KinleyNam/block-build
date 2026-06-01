import mongoose from "mongoose";

const hireRequestSchema = new mongoose.Schema({
  parcelId:          { type: Number, required: true },
  requesterUsername: { type: String, required: true },
  requesterWallet:   { type: String, default: "" },
  ownerWallet:       { type: String, default: "" },
}, { timestamps: true });

// One pending request per worker per parcel
hireRequestSchema.index({ parcelId: 1, requesterUsername: 1 }, { unique: true });

export default mongoose.model("HireRequest", hireRequestSchema);
