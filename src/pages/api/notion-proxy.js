
export async function POST({ request }) {
  try {

    const { endpoint, apiKey, body: requestBody } = await request.json();
    if (!apiKey) {
      return new Response(JSON.stringify({ message: "API key is missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const NOTION_API_URL = `https://api.notion.com/v1/${endpoint}`;

    const response = await fetch(NOTION_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json();
        return new Response(JSON.stringify(errorData), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
        });
    }
    
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
 
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
