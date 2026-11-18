// Подключение к Firebase (база данных + вход для админа)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, connectFirestoreEmulator, collection, getDocs, query, orderBy,
  addDoc, updateDoc, deleteDoc, doc, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig, USE_EMULATOR } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
if (USE_EMULATOR) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}

export async function list(name) {
  const snap = await getDocs(query(collection(db, name), orderBy("sort")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export const create = (name, data) => addDoc(collection(db, name), data);
export const update = (name, id, data) => updateDoc(doc(db, name, id), data);
export const remove = (name, id) => deleteDoc(doc(db, name, id));
export async function seed(name, items) {
  const batch = writeBatch(db);
  items.forEach((it) => batch.set(doc(collection(db, name)), it));
  await batch.commit();
}

export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const onUser = (cb) => onAuthStateChanged(auth, cb);
