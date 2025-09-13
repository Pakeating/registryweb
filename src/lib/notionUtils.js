export async function checkNotionDB(dbName, apiKey){
    let proxyResponse;
    try {
            proxyResponse = await fetch(`/api/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'search',
                    notionApiKey: apiKey, 
                    body: { query: dbName, filter: { value: 'database', property: 'object' } }
                })
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

