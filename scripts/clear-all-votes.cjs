const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc } = require("firebase/firestore");

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

  console.log("Fetching all users from Firestore...");
  const querySnapshot = await getDocs(collection(db, "users"));
  console.log(`Found ${querySnapshot.size} users. Resetting vote flags...`);

  let count = 0;
  for (const userDoc of querySnapshot.docs) {
    const userRef = doc(db, "users", userDoc.id);
    await updateDoc(userRef, {
      hasVoted: false
    });
    count++;
    console.log(`Reset hasVoted flag for: ${userDoc.data().name || userDoc.id}`);
  }

  console.log(`\nDone! Successfully reset hasVoted flag for ${count} users in Firebase.`);
}

main().catch(console.error);
