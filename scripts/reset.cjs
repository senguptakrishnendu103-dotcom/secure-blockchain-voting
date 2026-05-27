const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const [adminSigner] = await ethers.getSigners();
  const contract = await ethers.getContractAt("Voting", contractAddress, adminSigner);

  console.log("Resetting election state on the blockchain...");
  const tx = await contract.resetElection();
  await tx.wait();
  console.log("Blockchain election reset successful!");

  console.log("Starting the election automatically...");
  const txStart = await contract.startElection();
  await txStart.wait();
  console.log("Election started! Ready for voting.");
}

main().catch(console.error);
