import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "takip-bd0ba",
  "appId": "1:742752319419:web:bec1d6ad08898035a0769e",
  "storageBucket": "takip-bd0ba.firebasestorage.app",
  "apiKey": "AIzaSyAYfcQV-i-u4zEpYnBLb0ZSA7Nc70wrBVU",
  "authDomain": "takip-bd0ba.firebaseapp.com",
  "messagingSenderId": "742752319419",
  "measurementId": "G-945E5WFN6D",
  "projectNumber": "742752319419",
  "version": "2"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
