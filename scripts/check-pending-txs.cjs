const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const adminAddress = "0x27d0af872194F3eb0c6b55F668FBFF2942bA4bab";
  
  const latestCount = await provider.getTransactionCount(adminAddress, "latest");
  const pendingCount = await provider.getTransactionCount(adminAddress, "pending");
  
  console.log("Latest Nonce:", latestCount);
  console.log("Pending Nonce:", pendingCount);
}

main().catch(console.error);
