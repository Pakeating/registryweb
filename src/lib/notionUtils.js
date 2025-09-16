import { createDbIdQueryBody } from "./objects";
import { getAuth } from "firebase/auth";
import { openDB, getUserDataFromDb, forceRefreshUserData } from './auth.js';


export async function checkNotionDB(dbName, apiKey){
    let proxyResponse;
    try {
            let queryBody = createDbIdQueryBody();
            queryBody.parameters.apiKey = apiKey;
            queryBody.body.query = dbName;

            proxyResponse = await fetch(`/api/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(queryBody)
            });
            
            if (proxyResponse.status === 401) {
                console.warn("API Key no autorizada. Refrescando datos y reintentando...");
                throw new Error("La clave de API no es válida o no se encontró.");
            }

            if (!proxyResponse.ok) {
                const errorData = await proxyResponse.json();
                throw new Error(errorData.message || `Error encontrando la base de datos: ${proxyResponse.statusText}`);
            }

            const searchData = await proxyResponse.json();
            if (searchData.results.length > 0) {
                return searchData.results[0].id;
            } else {
                throw new Error(`La base de datos "${dbName}" no se encontró o la integración no tiene acceso a ella.`);
            }
        } catch (error) {
            console.error(error);
            alert(`Error de Notion: ${error.message}`);
            throw error; 
        }
}

/**
 * Obtiene las credenciales de Notion (API Key y DB ID) para el usuario actual.
 * Primero busca en la base de datos local (IndexedDB) y, si no las encuentra, 
 * fuerza una actualización desde el servidor (Firestore).
 * @returns {Promise<{apiKey: string, dbId: string}>} Un objeto con la apiKey y el dbId.
 * @throws {Error} Si el usuario no está autenticado o si las credenciales no se pueden encontrar.
 */
export async function getNotionCredentials() {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("Usuario no autenticado. No se pueden obtener las credenciales.");
    }

    try {
        const localDb = await openDB();
        let userData = await getUserDataFromDb(localDb, currentUser.uid);

        let apiKey = userData?.notion_api_key;
        let dbName = userData?.notion_db_name;

        // Si las credenciales no están en IndexedDB, forzar una recarga desde el servidor.
        if (!apiKey || !dbName) {
            console.log("Credenciales no encontradas en IndexedDB, forzando recarga desde el servidor.");
            userData = await forceRefreshUserData(currentUser.uid);
            apiKey = userData?.notion_api_key;
            dbName = userData?.notion_db_id;
        }

        // Si después de todo, seguimos sin tenerlas, es un error.
        if (!apiKey || !dbName) {
            throw new Error("No se pudieron obtener las credenciales de Notion (API Key o DB ID). Revisa tu configuración de perfil.");
        }

        return { apiKey, dbName: dbName };

    } catch (error) {
        console.error("Error crítico al obtener credenciales de Notion:", error);
        // Re-lanzamos el error para que el componente que llama a la función pueda manejarlo (ej: mostrar una alerta).
        throw error;
    }
}
