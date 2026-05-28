const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const contractAddress = (process.argv[2] || process.env.VITE_CONTRACT_ADDRESS || "").trim();

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const artifactPath = path.resolve(__dirname, "../src/artifacts/contracts/Voting.sol/Voting.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const contract = new ethers.Contract(contractAddress, artifact.abi, provider);

  const candidates = await contract.getCandidates();
  console.log(`--- SEPOLIA STATUS FOR CONTRACT ${contractAddress} ---`);
  candidates.forEach(c => {
    console.log(`${c.name} (ID: ${c.id}) - Votes: ${c.voteCount}`);
  });
}

main().catch(console.error);
