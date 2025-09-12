const NOTION_API_BASE_URL = 'https://api.notion.com/v1/';

/**
 * GET /api/notion-proxy
 * Un simple endpoint de health-check para "despertar" la función en un entorno serverless.
 */
export async function GET() {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * POST /api/notion-proxy
 * Actúa como un proxy seguro para la API de Notion.
 */
export async function POST({ request }) {
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
