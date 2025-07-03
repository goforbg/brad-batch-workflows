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
    // Using the official "mixed_companies/search" endpoint
    const apolloResponse = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        // The parameter for this endpoint is "organization_domains"
        organization_domains: domains
      }),
    });

    const responseBody = await apolloResponse.json();

    // Log the entire response to the server terminal for inspection
    console.log("--- Full Apollo Response ---");
    console.log(JSON.stringify(responseBody, null, 2));
    console.log("--------------------------");

    if (!apolloResponse.ok) {
      // If the response is not OK, we still want to see the body, so we throw an error with it
      throw new Error(`Apollo returned a ${apolloResponse.status} status. Check the server console for the full response.`);
    }

    // Check if the response contains the ID we need. 
    // Based on documentation, it is unlikely. This will likely be undefined.
    const searchListId = responseBody.qOrganizationSearchListId; // This is a guess

    res.status(200).json({ 
        message: "Test completed. Check the server console for the full response from Apollo.",
        searchIdFound: searchListId || "No direct search ID found.",
        data: responseBody
    });

  } catch (error) {
    console.error("Final Test Error:", error);
    res.status(500).json({ message: error.message });
  }
}