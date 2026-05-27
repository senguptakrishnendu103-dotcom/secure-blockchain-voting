const hre = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const contract = await hre.ethers.getContractAt("Voting", contractAddress);
  const signers = await hre.ethers.getSigners();

  console.log("--- Contract State ---");
  console.log("Election Started:", await contract.electionStarted());
  console.log("Election Ended:", await contract.electionEnded());

  console.log("\n--- Candidates and Votes ---");
  const candidates = await contract.getCandidates();
  for (let c of candidates) {
    console.log(`ID: ${c.id}, Name: ${c.name}, Votes: ${c.voteCount}`);
  }

  console.log("\n--- Voted Accounts (among the first 20) ---");
  let votedCount = 0;
  for (let i = 0; i < signers.length; i++) {
    const address = signers[i].address;
    const hasVoted = await contract.voters(address);
    if (hasVoted) {
      console.log(`Account #${i} (${address}) HAS VOTED.`);
      votedCount++;
    }
  }
  console.log(`Total on-chain voted accounts found: ${votedCount}`);
}

main().catch(console.error);
