const NOTION_API_BASE_URL = 'https://api.notion.com/v1/';

/**
 * GET /api/proxy
 * Un simple endpoint de health-check para "despertar" la función en un entorno serverless.
 */
export async function GET() {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * POST /api/proxy (Generic Query)
 * Actúa como un proxy seguro para la API de Notion. Se usará para todas las consultas a la API de Notion que no modifican datos.
 */
export async function POST({ request }) {
  return notionQueryProxy(request);
}

/**
 * PATCH /api/proxy (Generic Command)
 * Se usará para todos los comandos a la API de Notion que crean o modifican datos.
 */
export async function PATCH({ request }) {
    const command = await request.json();
    switch(command.parameters.storageOption){
      case 'NOTION':
        return notionCommandProxy(command);
      default: 
        return new Response(JSON.stringify({ message: 'La opción de almacenamiento no es válida' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Handles the Command for notion
 */
async function notionCommandProxy(command) {
  try {
    const mealData = command.body;
    const parameters = command.parameters;

    if (!parameters.endpoint || !parameters.apiKey) {
      return new Response(JSON.stringify({ message: 'El endpoint y la API key de Notion son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const notionApiUrl = new URL(parameters.endpoint, NOTION_API_BASE_URL);
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${parameters.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body:  JSON.stringify({
          parent: { database_id: parameters.dbId },
          properties: {
            'Nombre': { title: [{ text: { content: mealData.mealName } }] },
            'Fecha de Consumo': { date: { start: mealData.mealTime } },
            'Categoria de Comida': { select: { name: mealData.mealType } },
            'Fecha de Registro': { date: { start: mealData.mealAudit } },
            'Observaciones': { rich_text: [{ text: { content: mealData.mealDescription } }] }
        }
      })
    };

    const notionResponse = await fetch(notionApiUrl.toString(), options);
    const data = await notionResponse.json();

    return new Response(JSON.stringify(data), {
      status: notionResponse.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error en el proxy de Notion:', error);
    return new Response(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handles the Query for notion
 */
async function notionQueryProxy(request) {
  try {
    const { endpoint, notionApiKey, body: requestBody } = await request.json();

    if (!endpoint || !notionApiKey) {
      return new Response(JSON.stringify({ message: 'El endpoint y la API key de Notion son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const notionApiUrl = new URL(endpoint, NOTION_API_BASE_URL);
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(requestBody)
    };

    const notionResponse = await fetch(notionApiUrl.toString(), options);
    const data = await notionResponse.json();

    return new Response(JSON.stringify(data), {
      status: notionResponse.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en el proxy de Notion:', error);
    return new Response(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
