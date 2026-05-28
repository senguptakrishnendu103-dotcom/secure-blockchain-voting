const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const adminAddress = "0x27d0af872194F3eb0c6b55F668FBFF2942bA4bab";

  console.log("Fetching transactions for nonces 9 and 10...");
  
  // We can search the latest blocks or look up by transaction hashes if we can find them,
  // or we can scan blocks around the current block height.
  // Let's get the latest block number.
  const latestBlock = await provider.getBlockNumber();
  console.log("Latest Block:", latestBlock);

  // Instead of scanning blocks which can be slow, let's write a loop to search the last 20 blocks
  // to see if we find any transactions from our admin wallet.
  for (let i = latestBlock; i > latestBlock - 50; i--) {
    const block = await provider.getBlock(i, true);
    if (!block || !block.prefetchedTransactions) continue;
    for (const tx of block.prefetchedTransactions) {
      if (tx.from.toLowerCase() === adminAddress.toLowerCase()) {
        console.log(`Block ${i} | Tx Hash: ${tx.hash} | Nonce: ${tx.nonce} | To: ${tx.to} | Data: ${tx.data.slice(0, 50)}...`);
        // Get receipt to check status
        const receipt = await provider.getTransactionReceipt(tx.hash);
        console.log(`  Status: ${receipt ? (receipt.status === 1 ? "SUCCESS" : "REVERTED") : "UNKNOWN"}`);
      }
    }
  }
}

main().catch(console.error);
