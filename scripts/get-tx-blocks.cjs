const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const resetTx = await provider.getTransaction("0x4b8f8879e970f81575c5b919157548252cac56d31b603d92645e39ac4d16040a");
  const startTx = await provider.getTransaction("0xf6b95e9fc94dfd60a61f3aa5d73724cf5bf7b24c03381c148959e39e185183aa");

  console.log("Reset Tx Block Number:", resetTx ? resetTx.blockNumber : "not found");
  console.log("Start Tx Block Number:", startTx ? startTx.blockNumber : "not found");
}

main().catch(console.error);
