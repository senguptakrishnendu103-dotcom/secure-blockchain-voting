const { ethers } = require("hardhat");

async function main() {
  const targetAddress = "0x27d0af872194F3eb0c6b55F668FBFF2942bA4bab";
  
  const [signer] = await ethers.getSigners();
  console.log("Sending 200 ETH...");
  const tx = await signer.sendTransaction({
    to: targetAddress,
    value: ethers.parseEther("200.0")
  });
  await tx.wait();
  console.log("Done! Wallet funded with 200 ETH.");
}

main().catch(console.error);
