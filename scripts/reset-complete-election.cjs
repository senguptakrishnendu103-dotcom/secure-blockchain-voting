const { ethers } = require("ethers");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB01GDWyOLXTy9iPSSW-f9wVOKXLSpd4Qs",
  authDomain: "vote-71770.firebaseapp.com",
  projectId: "vote-71770",
  storageBucket: "vote-71770.firebasestorage.app",
  messagingSenderId: "325145094274",
  appId: "1:325145094274:web:01d93b9d696fc291cb2c9b",
  measurementId: "G-SHWT5LKT47"
};

async function main() {
  console.log("=== STARTING COMPLETE SYSTEM RESET ===\n");

  // 1. Reset Blockchain Contract
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const privateKey = (process.env.PRIVATE_KEY || "").trim();
  const contractAddress = (process.env.VITE_CONTRACT_ADDRESS || "").trim();

  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error("Missing environment variables in .env file (SEPOLIA_RPC_URL, PRIVATE_KEY, VITE_CONTRACT_ADDRESS)");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Load contract ABI
  const artifactPath = path.resolve(__dirname, "../src/artifacts/contracts/Voting.sol/Voting.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Voting artifact not found at: ${artifactPath}`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

  console.log(`Connecting to contract at: ${contractAddress}`);
  
  // A. Call resetElection()
  console.log("Calling resetElection() on blockchain...");
  const resetTx = await contract.resetElection();
  console.log(`Transaction sent! Hash: ${resetTx.hash}`);
  console.log("Waiting for confirmation (this may take a few seconds on Sepolia)...");
  await resetTx.wait();
  console.log("Election successfully reset on the blockchain!");

  // B. Call startElection()
  console.log("\nCalling startElection() on blockchain to resume polling...");
  const startTx = await contract.startElection();
  console.log(`Transaction sent! Hash: ${startTx.hash}`);
  console.log("Waiting for confirmation...");
  await startTx.wait();
  console.log("Polling is now LIVE on the blockchain!");

  // 2. Reset Firestore Users
  console.log("\nConnecting to Firebase Firestore...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Fetching all users from Firestore...");
  const querySnapshot = await getDocs(collection(db, "users"));
  console.log(`Found ${querySnapshot.size} users. Resetting vote status...`);

  let count = 0;
  for (const userDoc of querySnapshot.docs) {
    const userRef = doc(db, "users", userDoc.id);
    await updateDoc(userRef, {
      hasVoted: false
    });
    count++;
    console.log(`Reset hasVoted flag for: ${userDoc.data().name || userDoc.id}`);
  }

  console.log(`\nSuccessfully reset hasVoted flag for ${count} users in Firebase.`);
  console.log("\n=== SYSTEM RESET COMPLETE! THE PLATFORM IS FRESH AND READY FOR VOTING! ===");
}

main().catch((error) => {
  console.error("\nReset failed with error:", error);
  process.exit(1);
});
