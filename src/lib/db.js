const DB_NAME = 'RegistryDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_requests';

let db = null;

/**
 * Abre la conexión con la base de datos IndexedDB.
 * @returns {Promise<IDBDatabase>} Una promesa que se resuelve con el objeto de la base de datos.
 */
function openDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const tempDb = event.target.result;
            if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                tempDb.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Error al abrir IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Guarda una petición pendiente en la base de datos.
 * @param {object} requestData - El objeto de la petición a guardar (ej: {url, method, headers, body}).
 * @returns {Promise<number>} Una promesa que se resuelve con el ID de la petición guardada.
 */
export async function saveRequest(requestData) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(requestData);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Obtiene todas las peticiones pendientes de la base de datos.
 * @returns {Promise<Array<object>>} Una promesa que se resuelve con un array de peticiones pendientes.
 */
export async function getPendingRequests() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Elimina una petición de la base de datos por su ID.
 * @param {number} id - El ID de la petición a eliminar.
 * @returns {Promise<void>}
 */
export async function deleteRequest(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}