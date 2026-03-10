export default async function handler(request, response) {
    const targetUrl = request.query.url;

    if (!targetUrl) {
        return response.status(400).send('No URL provided');
    }

    try {
        // Fetch the Saweria alert page
        const proxyResponse = await fetch(targetUrl);

        // Get all the headers from Saweria
        const headers = new Headers();
        for (const [key, value] of proxyResponse.headers.entries()) {
            // THIS IS THE MAGIC FIX: We skip copying over the X-Frame-Options header
            if (key.toLowerCase() !== 'x-frame-options' && key.toLowerCase() !== 'content-security-policy') {
                headers.set(key, value);
            }
        }

        // Set CORS headers so your frontend is allowed to use this api
        headers.set('Access-Control-Allow-Origin', '*');

        // Read the HTML body
        const bodyText = await proxyResponse.text();

        // Send the fake response back to the React app without the blocking security rules!
        response.status(proxyResponse.status);
        for (const [key, value] of headers.entries()) {
            response.setHeader(key, value);
        }

        response.send(bodyText);

    } catch (error) {
        console.error('Proxy Fetch Error:', error);
        response.status(500).json({ error: 'Failed to fetch the target URL' });
    }
}
