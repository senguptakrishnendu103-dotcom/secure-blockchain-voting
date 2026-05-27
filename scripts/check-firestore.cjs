const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

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
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Fetching users from Firestore...");
  const querySnapshot = await getDocs(collection(db, "users"));
  console.log(`Found ${querySnapshot.size} users:\n`);

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`UID: ${doc.id}`);
    console.log(`  Name: ${data.name}`);
    console.log(`  Voter ID (EPIC): ${data.voterId}`);
    console.log(`  Email: ${data.email}`);
    console.log(`  Has Voted: ${data.hasVoted}`);
    console.log(`  Role: ${data.role}`);
    console.log("-----------------------------------------");
  });
}

main().catch(console.error);
