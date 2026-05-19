import { savePosition as savePositionAPI } from "../api";

export const LAND_PARCELS = [
  { id: "A1", label: "A-1", startX: 0,    endX: 500,  price: 100, tokenId: 1 },
  { id: "A2", label: "A-2", startX: 500,  endX: 1000, price: 120, tokenId: 2 },
  { id: "A3", label: "A-3", startX: 1000, endX: 1500, price: 140, tokenId: 3 },
  { id: "A4", label: "A-4", startX: 1500, endX: 2000, price: 160, tokenId: 4 },
  { id: "A5", label: "A-5", startX: 2000, endX: 2500, price: 180, tokenId: 5 },
];

const DEFAULT_SKILLS = {
  carpentry:     { exp: 0, level: 1 },
  blacksmithing: { exp: 0, level: 1 },
  magicResearch: { exp: 0, level: 1 },
};

const gameState = {
  username:      "",
  gender:        "Male",
  gold:          1000,
  walletAddress: "",
  skills:        { ...DEFAULT_SKILLS },
  landOwnership: {},   // parcelId → owner wallet address (lowercased)
  lastScene:     null, // persisted spawn scene
  lastX:         null,
  lastY:         null,
  _listeners:    [],

  on(fn)  { this._listeners.push(fn); },
  off(fn) { this._listeners = this._listeners.filter(f => f !== fn); },
  _emit() { this._listeners.forEach(fn => fn()); },

  setUser(userData, skillsData) {
    this.username = userData.username;
    this.gender   = userData.gender;
    if (userData.walletAddress) this.walletAddress = userData.walletAddress;
    if (skillsData) this.skills = skillsData;
    this._emit();
  },

  setSkills(skillsData) {
    this.skills = skillsData;
    this._emit();
  },

  // Called after reading getAllOwners() from the contract.
  // owners: array of 5 addresses in parcel order (address(0) = unowned).
  setLandOwnership(owners) {
    this.landOwnership = {};
    LAND_PARCELS.forEach((parcel, i) => {
      const addr = owners[i];
      if (addr && addr !== "0x0000000000000000000000000000000000000000") {
        this.landOwnership[parcel.id] = addr.toLowerCase();
      }
    });
    this._emit();
  },

  // Local-only update called after a successful on-chain buyLand tx.
  markLandOwned(parcelId, walletAddress) {
    this.landOwnership[parcelId] = walletAddress.toLowerCase();
    this._emit();
  },

  // Called by scenes on shutdown — persists spawn point to DB.
  savePosition(scene, x, y) {
    this.lastScene = scene;
    this.lastX     = Math.round(x);
    this.lastY     = Math.round(y);
    if (this.username) {
      savePositionAPI(this.username, scene, this.lastX, this.lastY).catch(() => {});
    }
  },
};

export default gameState;
