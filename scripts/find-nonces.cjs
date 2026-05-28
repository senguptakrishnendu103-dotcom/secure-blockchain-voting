const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const adminAddress = "0x27d0af872194F3eb0c6b55F668FBFF2942bA4bab";

  const startBlock = 10937440;
  const endBlock = await provider.getBlockNumber();
  
  console.log(`Scanning blocks from ${startBlock} to ${endBlock} for transactions from Admin: ${adminAddress}...`);
  
  for (let i = startBlock; i <= endBlock; i++) {
    const block = await provider.getBlock(i, true);
    if (!block || !block.prefetchedTransactions) continue;
    for (const tx of block.prefetchedTransactions) {
      if (tx.from.toLowerCase() === adminAddress.toLowerCase()) {
        console.log(`\nBlock ${i} | Tx Hash: ${tx.hash} | Nonce: ${tx.nonce}`);
        console.log(`  To: ${tx.to}`);
        console.log(`  Data: ${tx.data}`);
        const receipt = await provider.getTransactionReceipt(tx.hash);
        console.log(`  Status: ${receipt ? (receipt.status === 1 ? "SUCCESS" : "REVERTED") : "UNKNOWN"}`);
      }
    }
  }
  console.log("\nScan complete.");
}

main().catch(console.error);
