const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const privateKey = (process.env.PRIVATE_KEY || "").trim();
  const wallet = new ethers.Wallet(privateKey);
  console.log("Admin Wallet Address:", wallet.address);
}

main().catch(console.error);
