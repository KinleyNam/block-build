const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TOKEN_URIS = [
  "ipfs://QmU7uJAyw8sQ33XKUK8Rj8r5WGcFm8LdEa59J5o2S6kjU7", // A1
  "ipfs://QmYNU96gYD3omuunC7xzwiwwTP6jH2sS16HrZmQTjjBm47",  // A2
  "ipfs://QmbJENwjN63RugrN358UV4yzZWGPghQC9ohTJRwyy4WfLZ",  // A3
  "ipfs://QmbaKpGC27k2mzHS11TnKZ4d5UGv7rCe1VMAmdXhLuzhks", // A4
  "ipfs://QmWbKWbWSVfVB2kpesA9KsQnsU3tB5Yvs58wq9tC5kvejL",  // A5
];

module.exports = buildModule("BlockBuildModule", (m) => {
  const deployer = m.getAccount(0);

  const gold   = m.contract("Gold",    [deployer]);
  const landNFT = m.contract("LandNFT", [gold, deployer]);

  // Set Pinata IPFS metadata URI for each parcel after deployment
  TOKEN_URIS.forEach((uri, i) => {
    m.call(landNFT, "setTokenURI", [i + 1, uri], { id: `setURI_${i + 1}` });
  });

  return { gold, landNFT };
});
