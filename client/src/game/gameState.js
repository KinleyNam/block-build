export const LAND_PARCELS = [
  { id: "A1", label: "A-1", startX: 0,    endX: 500,  price: 100 },
  { id: "A2", label: "A-2", startX: 500,  endX: 1000, price: 120 },
  { id: "A3", label: "A-3", startX: 1000, endX: 1500, price: 140 },
  { id: "A4", label: "A-4", startX: 1500, endX: 2000, price: 160 },
  { id: "A5", label: "A-5", startX: 2000, endX: 2500, price: 180 },
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
  skills:        { ...DEFAULT_SKILLS },
  landOwnership: {},
  _listeners:    [],

  on(fn)  { this._listeners.push(fn); },
  off(fn) { this._listeners = this._listeners.filter(f => f !== fn); },
  _emit() { this._listeners.forEach(fn => fn()); },

  setUser(userData, skillsData) {
    this.username = userData.username;
    this.gender   = userData.gender;
    if (skillsData) this.skills = skillsData;
    this._emit();
  },

  setSkills(skillsData) {
    this.skills = skillsData;
    this._emit();
  },

  buyLand(landId) {
    const parcel = LAND_PARCELS.find(p => p.id === landId);
    if (!parcel)                    return { ok: false, reason: "not_found" };
    if (this.landOwnership[landId]) return { ok: false, reason: "already_owned" };
    if (this.gold < parcel.price)   return { ok: false, reason: "insufficient_gold" };
    this.gold -= parcel.price;
    this.landOwnership[landId] = this.username;
    this._emit();
    return { ok: true };
  },
};

export default gameState;
