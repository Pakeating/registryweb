/*
 * ====================================================================================
 * MÓDULO DE BASE DE DATOS (IndexedDB)
 * ====================================================================================
 */
const DB_NAME = 'RegistryDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_requests';
let db = null;

function openDB() {
    if (db) return Promise.resolve(db);
    return new Promise((resolve, reject) => {
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
        request.onerror = (event) => reject(event.target.error);
    });
}

async function saveRequest(requestData) {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.add(requestData);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function getPendingRequests() {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function deleteRequest(id) {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

/*
 * ====================================================================================
 * MÓDULO GESTOR DE SINCRONIZACIÓN (Background Sync)
 * ====================================================================================
 */
async function handleSync() {
    console.log('[SyncManager] Evento de sincronización recibido.');
    try {
        const pendingRequests = await getPendingRequests();
        console.log(`[SyncManager] Procesando ${pendingRequests.length} peticiones pendientes.`);
        for (const req of pendingRequests) {
            try {
                const response = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
                if (response.ok) {
                    console.log(`[SyncManager] Petición ${req.id} enviada con éxito.`);
                    await deleteRequest(req.id);
                } else {
                    console.warn(`[SyncManager] La petición ${req.id} falló con estado ${response.status}. Se elimina para evitar bucles.`);
                    await deleteRequest(req.id);
                }
            } catch (error) {
                console.error(`[SyncManager] Error de red al enviar la petición ${req.id}. Se reintentará más tarde.`, error);
            }
        }
    } catch (error) {
        console.error('[SyncManager] Error al procesar la cola de peticiones:', error);
    }
}

/*
 * ====================================================================================
 * NÚCLEO DEL SERVICE WORKER
 * ====================================================================================
 */
const CACHE_NAME = 'static-cache-v7'; 
const ASSETS_TO_CACHE = [
    '/',
    '/loginPage',
    '/stats',
    '/favicon.svg',
    '/google.svg',
    '/icons/icon-192x192.svg',
    '/icons/icon-512x512.svg'
];

self.addEventListener('install', event => {
    console.log('[Service Worker] Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Pre-cacheando assets críticos.');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('[Service Worker] Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Borrando caché antigua:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('sync', event => {
    if (event.tag === 'sync-pending-meals') {
        event.waitUntil(handleSync());
    }
});

self.addEventListener('fetch', event => {
    const { request } = event;

    // Estrategia para peticiones POST a la API (Offline First)
    if (request.method === 'PATCH' && request.url.includes('/api/')) {
        return event.respondWith(
            fetch(request.clone()).catch(async () => {
                console.log('[Service Worker] Petición POST fallida. Guardando para sincronización.');
                const body = await request.clone().json();
                const requestData = { 
                    url: request.url, 
                    method: request.method, 
                    headers: Object.fromEntries(request.headers.entries()), 
                    body: JSON.stringify(body) 
                };
                await saveRequest(requestData);
                return new Response(JSON.stringify({ message: 'La petición fue encolada.' }), { status: 202, headers: { 'Content-Type': 'application/json' } });
            })
        );
    }

    // Ignorar otras peticiones a la API que no sean POST
    if (request.url.includes('/api/')) {
        return;
    }
    
    // Estrategia "Network First, fallback to Cache" para todo lo demás (GET)
    if (request.method === 'GET') {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(request).then(networkResponse => {
                    // Si la petición de red fue exitosa, la guardamos en caché para el futuro
                    if (networkResponse && networkResponse.ok) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Si la petición de red falla (estamos offline), intentamos servir desde la caché
                    return cache.match(request);
                });
            })
        );
    }
});
