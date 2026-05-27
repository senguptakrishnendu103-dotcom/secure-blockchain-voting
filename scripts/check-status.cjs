const hre = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const contract = await hre.ethers.getContractAt("Voting", contractAddress);

  console.log("--- Contract Info ---");
  console.log("Address:", contractAddress);
  console.log("Admin Address:", await contract.admin());
  console.log("Election Started:", await contract.electionStarted());
  console.log("Election Ended:", await contract.electionEnded());

  const testAccounts = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Account 0 (Admin)
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account 1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account 2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906"  // Account 3
  ];

  console.log("\n--- On-Chain Vote Status for Test Accounts ---");
  for (let i = 0; i < testAccounts.length; i++) {
    const hasVoted = await contract.voters(testAccounts[i]);
    console.log(`Account #${i} (${testAccounts[i]}): Has Voted = ${hasVoted}`);
  }
}

main().catch(console.error);
