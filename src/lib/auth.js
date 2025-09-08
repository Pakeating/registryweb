import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from "firebase/firestore";

// Abre la conexión a IndexedDB.
export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("firebase-user-data", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("user-documents")) {
                db.createObjectStore("user-documents", { keyPath: "uid" });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject("Error opening IndexedDB: " + event.target.errorCode);
        };
    });
}

// Guarda los datos del usuario en IndexedDB.
export async function saveUserData(localDb, userData) {
    return new Promise((resolve, reject) => {
        const transaction = localDb.transaction(["user-documents"], "readwrite");
        const store = transaction.objectStore("user-documents");
        const request = store.put(userData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject("Error saving user data to IndexedDB");
    });
}

// Obtiene los datos del usuario de IndexedDB.
export async function getUserDataFromDb(localDb, uid) {
    return new Promise((resolve, reject) => {
        const transaction = localDb.transaction(["user-documents"], "readonly");
        const store = transaction.objectStore("user-documents");
        const request = store.get(uid);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Error fetching user data from IndexedDB");
    });
}

/**
 * FUERZA la recarga de los datos del usuario desde Firestore y actualiza IndexedDB.
 * Esta función es clave para invalidar la caché cuando la clave de API es incorrecta.
 */
export async function forceRefreshUserData(uid) {
    try {
        console.log("Forzando actualización de datos desde Firestore...");
        const userDocRef = doc(db, "usuarios", uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = { uid: uid, ...userDocSnap.data() };
            const localDb = await openDB();
            await saveUserData(localDb, userData);
            console.log("Datos actualizados y guardados en IndexedDB:", userData);
            return userData;
        } else {
            console.warn("No se encontró documento en Firestore durante la actualización forzada.");
            return null;
        }
    } catch (error) {
        console.error("Error durante la actualización forzada de datos:", error);
        return null;
    }
}


// Esta función inicializa la sesión, ahora usando las funciones exportadas.
export async function initializeAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (window.location.pathname === '/' || window.location.pathname.startsWith('/login')) {
            return; 
        }

        if (user) {
            const localDb = await openDB();
            let userData = await getUserDataFromDb(localDb, user.uid);

            if (userData) {
                console.log("Documento de usuario encontrado en IndexedDB:", userData);
            } else {
                console.log("No se encontró el documento en IndexedDB, buscando en Firestore...");
                // Usamos la lógica de refresco para obtener y guardar los datos.
                userData = await forceRefreshUserData(user.uid);
                if (!userData) {
                     console.log("No se encontró un documento para este usuario.");
                }
            }
        } else {
            console.log("Usuario no autenticado, redirigiendo a inicio...");
            window.location.href = '/';
        }
    });
}

// Exporta la función para guardar la API key para que la use el formulario de perfil
export async function saveNotionApiKey(userId, apiKey) {
    const userDocRef = doc(db, 'usuarios', userId);
    await setDoc(userDocRef, { notion_api_key: apiKey }, { merge: true });
    // Forzar la actualización de IndexedDB inmediatamente después de guardar
    await forceRefreshUserData(userId);
  }
