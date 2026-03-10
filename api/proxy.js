export default async function handler(request, response) {
    const targetUrl = request.query.url;

    if (!targetUrl) {
        return response.status(400).send('No URL provided');
    }

    try {
        // Spoof a real browser so Saweria's anti-bot/rate-limiter doesn't block Vercel IPs
        const proxyResponse = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
            }
        });

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
