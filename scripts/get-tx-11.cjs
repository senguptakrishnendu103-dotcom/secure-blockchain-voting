const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const adminAddress = "0x27d0af872194F3eb0c6b55F668FBFF2942bA4bab";

  const startBlock = 10937596;
  const endBlock = await provider.getBlockNumber();
  
  console.log(`Scanning blocks from ${startBlock} to ${endBlock} for transaction nonce 11 from: ${adminAddress}...`);
  
  for (let i = startBlock; i <= endBlock; i++) {
    const block = await provider.getBlock(i, true);
    if (!block || !block.prefetchedTransactions) continue;
    for (const tx of block.prefetchedTransactions) {
      if (tx.from.toLowerCase() === adminAddress.toLowerCase() && tx.nonce === 11) {
        console.log(`\nFound Nonce 11! Block: ${i} | Tx Hash: ${tx.hash}`);
        console.log(`  To: ${tx.to}`);
        console.log(`  Data: ${tx.data}`);
        const receipt = await provider.getTransactionReceipt(tx.hash);
        console.log(`  Status: ${receipt ? (receipt.status === 1 ? "SUCCESS" : "REVERTED") : "UNKNOWN"}`);
        return;
      }
    }
  }
  console.log("\nTransaction with nonce 11 not found in this range.");
}

main().catch(console.error);
