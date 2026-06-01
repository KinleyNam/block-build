const BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function createUser(username, gender, walletAddress, customization) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify({ username, walletAddress, gender, customization }),
  });
}

export function getUserByWallet(address) {
  return request(`/users/by-wallet/${address.toLowerCase()}`);
}

export function getSkills(username) {
  return request(`/users/${username}/skills`);
}

export function savePosition(username, scene, x, y) {
  return request(`/users/${username}/position`, {
    method: "PATCH",
    body: JSON.stringify({ scene, x, y }),
  });
}

export function getLeaderboard() {
  return request("/users/leaderboard");
}
