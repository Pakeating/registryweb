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
const STATIC_CACHE_NAME = 'static-cache-v9';
const DYNAMIC_CACHE_NAME = 'dynamic-cache-v9';
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
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Pre-cacheando assets críticos.');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('[Service Worker] Activando...');
    const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('[Service Worker] Borrando caché antigua:', cacheName);
                        return caches.delete(cacheName);
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
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/proxy')) {
        if (request.method === 'POST') {
            return event.respondWith((async () => {
                try {
                    const requestBody = await request.clone().json();
                    if (requestBody.parameters?.searchType === 'DATABASE') {
                        const cacheKey = 'database-id-cache-key';
                        const cache = await caches.open(DYNAMIC_CACHE_NAME);

                        try {
                            const networkResponse = await fetch(request.clone());
                            console.log('[SW] Búsqueda de DB ID: Obtenido de la red.');
                            if (networkResponse.ok) {
                                console.log('[SW] Búsqueda de DB ID: Respuesta guardada en caché.');
                                cache.put(cacheKey, networkResponse.clone());
                            }
                            return networkResponse;
                        } catch (error) {
                            console.log('[SW] Búsqueda de DB ID: Falló la red, intentando desde caché.');
                            const cachedResponse = await cache.match(cacheKey);
                             if (cachedResponse) {
                                console.log('[SW] Búsqueda de DB ID: Servido desde caché.');
                                return cachedResponse;
                            }
                            return new Response(JSON.stringify({ message: "Offline y la DB ID no estaba en caché." }), { status: 503, headers: { 'Content-Type': 'application/json' } });
                        }
                    }
                } catch (err) {
                    // Not a JSON body, so we assume it's a meal submission.
                }

                // Fallback for other POST requests (meal submission)
                return fetch(request.clone()).catch(async () => {
                    console.log('[SW] Petición POST (registro de comida) fallida. Guardando para sincronización.');
                    const body = await request.clone().json();
                    await saveRequest({ url: request.url, method: request.method, headers: Object.fromEntries(request.headers.entries()), body: JSON.stringify(body) });
                    return new Response(JSON.stringify({ message: 'La petición fue encolada.' }), { status: 202, headers: { 'Content-Type': 'application/json' } });
                });
            })());
        }

        if (request.method === 'PATCH') {
            return event.respondWith(
                fetch(request.clone()).catch(async () => {
                    console.log('[SW] Petición PATCH fallida. Guardando para sincronización.');
                    const body = await request.clone().json();
                    await saveRequest({ url: request.url, method: request.method, headers: Object.fromEntries(request.headers.entries()), body: JSON.stringify(body) });
                    return new Response(JSON.stringify({ message: 'La petición fue encolada.' }), { status: 202, headers: { 'Content-Type': 'application/json' } });
                })
            );
        }
    }

    if (request.method === 'GET') {
        event.respondWith(
            caches.open(STATIC_CACHE_NAME).then(cache => {
                return fetch(request).then(networkResponse => {
                    if (networkResponse && networkResponse.ok && url.origin === self.location.origin) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => cache.match(request));
            })
        );
    }
});
