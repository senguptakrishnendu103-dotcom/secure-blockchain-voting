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
  console.log("=== STARTING ELECTION ON SEPOLIA ===\n");

  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const privateKey = (process.env.PRIVATE_KEY || "").trim();
  const contractAddress = (process.env.VITE_CONTRACT_ADDRESS || "").trim();

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const artifactPath = path.resolve(__dirname, "../src/artifacts/contracts/Voting.sol/Voting.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

  // 1. Call startElection()
  console.log("Calling startElection() on Sepolia contract...");
  const tx = await contract.startElection();
  console.log(`Transaction sent! Hash: ${tx.hash}`);
  console.log("Waiting for confirmation...");
  await tx.wait();
  console.log("SUCCESS: Polling is now officially LIVE on the blockchain!");

  // 2. Reset Firebase users
  console.log("\nResetting Firebase hasVoted flags to false...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const querySnapshot = await getDocs(collection(db, "users"));
  for (const userDoc of querySnapshot.docs) {
    await updateDoc(doc(db, "users", userDoc.id), { hasVoted: false });
    console.log(`Reset hasVoted flag for: ${userDoc.data().name || userDoc.id}`);
  }
  console.log("\n=== SYSTEM IS NOW READY. PLEASE CAST A VOTE! ===");
}

main().catch(console.error);
