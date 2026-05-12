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

export function createUser(username, gender) {
  const walletAddress = crypto.randomUUID();
  return request("/users", {
    method: "POST",
    body: JSON.stringify({ username, walletAddress, gender }),
  });
}

export function getUser(username) {
  return request(`/users/${username}`);
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
