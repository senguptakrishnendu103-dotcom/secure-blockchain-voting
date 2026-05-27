require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Fallback to a dummy key to prevent Hardhat from crashing during local development
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

module.exports = {
  solidity: "0.8.28",
  paths: {
    artifacts: "./src/artifacts", // Output artifacts inside src folder so React can access them
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: [PRIVATE_KEY]
    }
  }
};
