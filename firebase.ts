import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

// This will be populated after set_up_firebase is accepted
const firebaseConfig = {
  apiKey: "PLACEHOLDER",
  authDomain: "PLACEHOLDER",
  projectId: "PLACEHOLDER",
  storageBucket: "PLACEHOLDER",
  messagingSenderId: "PLACEHOLDER",
  appId: "PLACEHOLDER"
};

// Try to load from config file if it exists
let app;
try {
  const config = require('./firebase-applet-config.json');
  app = initializeApp(config);
} catch (e) {
  app = initializeApp(firebaseConfig);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/documents');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

export interface SavedTranscription {
  id?: string;
  userId: string;
  title: string;
  markdown: string;
  context: string;
  timestamp: Timestamp;
}

export const saveTranscription = async (userId: string, title: string, markdown: string, context: string) => {
  return addDoc(collection(db, 'transcriptions'), {
    userId,
    title,
    markdown,
    context,
    timestamp: Timestamp.now()
  });
};

export const subscribeToTranscriptions = (userId: string, callback: (data: SavedTranscription[]) => void) => {
  const q = query(
    collection(db, 'transcriptions'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const transcriptions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavedTranscription[];
    callback(transcriptions);
  });
};
