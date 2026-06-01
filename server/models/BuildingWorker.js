import mongoose from "mongoose";

const buildingWorkerSchema = new mongoose.Schema({
  parcelId:       { type: Number, required: true, unique: true },
  workerUsername: { type: String, required: true },
  workerWallet:   { type: String, default: "" },
  ownerUsername:  { type: String, default: "" },
  ownerWallet:    { type: String, default: "" },
  lastWorked:     { type: Date,   default: null },
});

export default mongoose.model("BuildingWorker", buildingWorkerSchema);
