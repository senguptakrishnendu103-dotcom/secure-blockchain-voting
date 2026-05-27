const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, deleteDoc } = require("firebase/firestore");

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

  console.log("Fetching all users from Firestore to delete...");
  const querySnapshot = await getDocs(collection(db, "users"));
  
  if (querySnapshot.empty) {
    console.log("No users found in the database. It is already completely clean!");
    return;
  }

  console.log(`Found ${querySnapshot.size} users. Deleting them now...`);

  let count = 0;
  for (const userDoc of querySnapshot.docs) {
    const userRef = doc(db, "users", userDoc.id);
    await deleteDoc(userRef);
    count++;
    console.log(`Deleted user: ${userDoc.data().name || userDoc.id}`);
  }

  console.log(`\nDone! Successfully wiped ${count} users from the Firestore Database.`);
}

main().catch(console.error);
