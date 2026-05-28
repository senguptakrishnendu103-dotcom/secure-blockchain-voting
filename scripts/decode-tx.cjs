const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const txHash = "0x575afc5ada8a0dfe0aa8d1fdb8ac0aef7b2e2f13cfdb564bcd249e0777f092b6";
  const tx = await provider.getTransaction(txHash);
  
  if (!tx) {
    console.log("Transaction not found");
    return;
  }

  const artifactPath = path.resolve(__dirname, "../src/artifacts/contracts/Voting.sol/Voting.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  const iface = new ethers.Interface(artifact.abi);
  const decoded = iface.parseTransaction({ data: tx.data });
  
  console.log("Function Name:", decoded.name);
  console.log("Arguments:");
  decoded.args.forEach((arg, index) => {
    console.log(`  [${index}] ${decoded.fragment.inputs[index].name} (${decoded.fragment.inputs[index].type}): ${arg.toString()}`);
  });
}

main().catch(console.error);
