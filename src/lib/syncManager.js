import { getPendingRequests, deleteRequest } from './db.js';

/**
 * Procesa las peticiones pendientes, intentando enviarlas a la red.
 * Si una petición tiene éxito, se elimina de la base de datos local.
 */
async function processPendingRequests() {
    try {
        const pendingRequests = await getPendingRequests();
        console.log(`[SyncManager] Procesando ${pendingRequests.length} peticiones pendientes.`);

        for (const req of pendingRequests) {
            try {
                // Reconstruimos y enviamos la petición
                const response = await fetch(req.url, {
                    method: req.method,
                    headers: req.headers,
                    body: req.body
                });

                if (response.ok) {
                    console.log(`[SyncManager] Petición ${req.id} enviada con éxito.`);
                    // Si el envío fue exitoso, la eliminamos de la cola
                    await deleteRequest(req.id);
                } else {
                    // Si el servidor responde con un error (4xx, 5xx), la petición no se reintentará indefinidamente.
                    // Podrías añadir lógica aquí para manejar errores específicos del servidor.
                    console.warn(`[SyncManager] La petición ${req.id} falló con estado ${response.status}. No se reintentará.`,
                     await response.text());
                    await deleteRequest(req.id); // La eliminamos para evitar bucles infinitos
                }
            } catch (error) {
                // Si el error es de red (fetch falla), la dejamos para el próximo intento de sincronización.
                console.error(`[SyncManager] Error de red al enviar la petición ${req.id}. Se reintentará más tarde.`, error);
            }
        }
    } catch (error) {
        console.error('[SyncManager] Error al procesar la cola de peticiones:', error);
    }
}

/**
 * La función principal que se llamará desde el evento 'sync' del service worker.
 */
export function handleSync() {
    console.log('[SyncManager] Evento de sincronización recibido.');
    // Devolvemos la promesa para que el service worker sepa cuándo hemos terminado.
    return processPendingRequests();
}
