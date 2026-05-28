const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const txHash = "0x575afc5ada8a0dfe0aa8d1fdb8ac0aef7b2e2f13cfdb564bcd249e0777f092b6";
  const tx = await provider.getTransaction(txHash);
  
  if (tx) {
    console.log("Tx Hash:", tx.hash);
    console.log("Tx Nonce:", tx.nonce);
    console.log("Tx Input Data:", tx.data);
  } else {
    console.log("Tx not found");
  }
}

main().catch(console.error);
