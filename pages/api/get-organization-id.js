export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'API Key is not configured.' });
  }

  const { domains } = req.body;

  try {
    const apolloResponse = await fetch('https://app.apollo.io/api/v1/organization_search_lists/save_query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        query: domains.join('\n')
      }),
    });

    const responseBody = await apolloResponse.json();

    if (!apolloResponse.ok) {
      
      console.error("Apollo Error Response:", JSON.stringify(responseBody, null, 2));
      throw new Error(`Apollo returned a ${apolloResponse.status} status.`);
    }

    
    const searchListId = responseBody.listId;

    if (!searchListId) {
        
        console.log("Full response that caused the error:", JSON.stringify(responseBody, null, 2));
        throw new Error("Response from Apollo was successful, but did not contain a 'listId'.");
    }

    
    res.status(200).json({ searchListId: searchListId });

  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ message: error.message });
  }
}