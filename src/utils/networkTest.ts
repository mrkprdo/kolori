// Simple network connectivity test for debugging
export const testNetworkConnectivity = async (ip: string): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> => {
  const urls = [
    `http://${ip}/json/info`,
    `http://${ip}:80/json/info`,
    `http://${ip}/`,
    `http://${ip}:80/`
  ];

  console.log(`Testing network connectivity to ${ip}...`);
  
  for (const url of urls) {
    try {
      console.log(`Trying ${url}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`${url} - Status: ${response.status}, OK: ${response.ok}`);
      
      if (response.ok) {
        const text = await response.text();
        console.log(`${url} - Response length: ${text.length}`);
        
        try {
          const json = JSON.parse(text);
          return {
            success: true,
            details: {
              url,
              status: response.status,
              data: json
            }
          };
        } catch (parseError) {
          console.log(`${url} - Not JSON, but got response: ${text.substring(0, 100)}...`);
          return {
            success: true,
            details: {
              url,
              status: response.status,
              isHtml: text.includes('<html'),
              length: text.length
            }
          };
        }
      }
    } catch (error: any) {
      console.log(`${url} - Error: ${error.message}`);
    }
  }

  return {
    success: false,
    error: 'All connection attempts failed'
  };
};