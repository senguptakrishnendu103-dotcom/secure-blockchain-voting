const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.VITE_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  
  console.log("RPC URL:", rpcUrl);
  console.log("Private Key set:", privateKey ? "YES (length: " + privateKey.length + ")" : "NO");
  
  if (!privateKey) {
    console.error("ERROR: No PRIVATE_KEY found in .env");
    return;
  }
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deployer Address:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("WARNING: Wallet has 0 ETH. You need Sepolia ETH to deploy!");
  } else {
    console.log("OK: Wallet has enough ETH to deploy.");
  }
  
  // Also check the old contract
  const contractAddr = "0xA033b7a4d0A2713254742945381D921F37DDf000";
  const code = await provider.getCode(contractAddr);
  console.log("\nOld contract at", contractAddr);
  console.log("Has bytecode:", code !== "0x" ? "YES (" + code.length + " chars)" : "NO");
  
  // Try calling getCandidates on the old contract
  const VotingArtifact = require('../src/artifacts/contracts/Voting.sol/Voting.json');
  const contract = new ethers.Contract(contractAddr, VotingArtifact.abi, provider);
  try {
    const candidates = await contract.getCandidates();
    console.log("getCandidates() returned:", candidates.length, "candidates");
    candidates.forEach(c => console.log("  -", c.name, "votes:", c.voteCount.toString()));
  } catch (e) {
    console.log("getCandidates() REVERTED:", e.message.substring(0, 200));
  }
}

main().catch(console.error);
