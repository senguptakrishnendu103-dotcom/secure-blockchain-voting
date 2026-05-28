const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const balance = await provider.getBalance("0x27d0af872194F3eb0c6b55F668FBFF2942bA4bab");
  console.log("Admin Balance on Sepolia:", ethers.formatEther(balance), "ETH");
}

main().catch(console.error);
