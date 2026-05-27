const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc, doc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyDummyKey", // The actual project uses real credentials in src/firebase.js, I need to read them!
};
