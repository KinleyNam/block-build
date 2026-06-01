const BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : `http://${window.location.hostname}:3000`;

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

export function saveCustomization(username, customization) {
  return request(`/users/${username}/customization`, {
    method: "PATCH",
    body: JSON.stringify({ customization }),
  });
}

export function getUser(username) {
  return request(`/users/${username}`);
}

export function getUserByWallet(address) {
  return request(`/users/by-wallet/${address.toLowerCase()}`);
}

export function getSkills(username) {
  return request(`/users/${username}/skills`);
}

export function addExp(username, skill, amount) {
  return request(`/users/${username}/skills/${skill}/exp`, {
    method: "PATCH",
    body: JSON.stringify({ amount }),
  });
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
