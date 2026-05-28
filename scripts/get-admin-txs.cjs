const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const adminAddress = "0x27d0af872194F3eb0c6b55F668FBFF2942bA4bab";
  
  const count = await provider.getTransactionCount(adminAddress);
  console.log("Total transaction count (nonce):", count);

  // Let's query recent transactions. Etherscan API is best for this, 
  // but we can also just check if the nonce has changed since our last startElection transaction!
  // Our startElection transaction was nonce: count - 1. Let's see what the latest transactions are if possible.
}

main().catch(console.error);
