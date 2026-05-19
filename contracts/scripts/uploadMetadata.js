/**
 * Uploads the land image + 5 parcel metadata JSONs to Pinata.
 *
 * Usage (from contracts/ folder):
 *   node scripts/uploadMetadata.js
 *
 * Requires PINATA_JWT in contracts/.env
 * Get your JWT from: https://app.pinata.cloud/developers/api-keys
 */

const fs      = require("fs");
const path    = require("path");
const axios   = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const PINATA_JWT = process.env.PINATA_JWT;
if (!PINATA_JWT) {
  console.error("Error: PINATA_JWT not set in contracts/.env");
  process.exit(1);
}

const PARCELS = [
  { tokenId: 1, id: "A1", label: "A-1", price: 100, xStart: 0,    xEnd: 500  },
  { tokenId: 2, id: "A2", label: "A-2", price: 120, xStart: 500,  xEnd: 1000 },
  { tokenId: 3, id: "A3", label: "A-3", price: 140, xStart: 1000, xEnd: 1500 },
  { tokenId: 4, id: "A4", label: "A-4", price: 160, xStart: 1500, xEnd: 2000 },
  { tokenId: 5, id: "A5", label: "A-5", price: 180, xStart: 2000, xEnd: 2500 },
];

const IMAGE_PATH = path.join(__dirname, "../../client/src/assets/UIElement/land-Image.png");

async function uploadFile(filePath, name, mimeType = "image/png") {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), { filename: name, contentType: mimeType });
  form.append("pinataMetadata", JSON.stringify({ name }));

  const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", form, {
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      ...form.getHeaders(),
    },
    maxBodyLength: Infinity,
  });

  return res.data.IpfsHash;
}

async function uploadJSON(json, name) {
  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    { pinataContent: json, pinataMetadata: { name } },
    { headers: { Authorization: `Bearer ${PINATA_JWT}`, "Content-Type": "application/json" } }
  );
  return res.data.IpfsHash;
}

async function main() {
  console.log("Uploading land image to Pinata...");
  const imageCid = await uploadFile(IMAGE_PATH, "blockbuild-land.png");
  const imageURI = `ipfs://${imageCid}`;
  console.log(`Image CID: ${imageCid}`);
  console.log(`Image URI: ${imageURI}\n`);

  const results = [];

  for (const parcel of PARCELS) {
    const metadata = {
      name:        `BlockBuild Land ${parcel.label}`,
      description: `A land parcel in the BlockBuild Commercial District. Parcel ${parcel.label} spans world coordinates x: ${parcel.xStart}–${parcel.xEnd}.`,
      image:       imageURI,
      attributes: [
        { trait_type: "Parcel ID",    value: parcel.id         },
        { trait_type: "District",     value: "Commercial"      },
        { trait_type: "Base Price",   value: `${parcel.price} GOLD` },
        { trait_type: "World X Start", value: parcel.xStart    },
        { trait_type: "World X End",   value: parcel.xEnd      },
      ],
    };

    console.log(`Uploading metadata for ${parcel.label}...`);
    const metaCid = await uploadJSON(metadata, `blockbuild-land-${parcel.id}`);
    const metaURI = `ipfs://${metaCid}`;
    results.push({ tokenId: parcel.tokenId, label: parcel.label, uri: metaURI });
    console.log(`  Token ${parcel.tokenId} (${parcel.label}): ${metaURI}`);
  }

  console.log("\n=== Paste these into setTokenURI calls or your deploy script ===");
  results.forEach(r => console.log(`Token ${r.tokenId}: "${r.uri}"`));

  console.log("\n=== Add to contracts/.env ===");
  console.log(`PINATA_URIS=${results.map(r => r.uri).join(",")}`);
}

main().catch(err => {
  console.error(err?.response?.data || err.message);
  process.exit(1);
});
