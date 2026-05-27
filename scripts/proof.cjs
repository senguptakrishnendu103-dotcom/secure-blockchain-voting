const { ethers } = require("hardhat");

async function main() {
  const contract = await ethers.getContractAt('Voting', '0x5FbDB2315678afecb367f032d93F642f64180aa3');

  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║        BLOCKCHAIN PROOF - LIVE DATA               ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log("");
  console.log("Smart Contract Address:", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  console.log("Admin (deployer):", await contract.admin());
  console.log("Election Started:", await contract.electionStarted());
  console.log("Election Ended:", await contract.electionEnded());
  console.log("");

  const candidates = await contract.getCandidates();
  console.log("Candidates stored ON THE BLOCKCHAIN:");
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    console.log("  #" + c.id.toString() + " " + c.name + " -> " + c.voteCount.toString() + " votes");
  }

  console.log("");
  console.log("PROOF: This data lives INSIDE the Ethereum Smart Contract.");
  console.log("It is stored in blocks. It CANNOT be edited or deleted.");
  console.log("This is the SAME technology used by Bitcoin and Ethereum.");
}

main().catch(console.error);
