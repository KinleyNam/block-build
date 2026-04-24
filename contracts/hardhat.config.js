require("@nomicfoundation/hardhat-toolbox");
// require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
    },
  },
  // networks: {
  //   sepolia: {
  //     url: process.env.SEPOLIA_RPC_URL,
  //     accounts: [process.env.PRIVATE_KEY],
  //   },
  // },
};
