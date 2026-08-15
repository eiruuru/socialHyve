export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function redirectResponse(url: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: url, ...corsHeaders },
  });
}

export function redirectResponseWithDelay(url: string, delayMs = 1000) {
  const safeUrl = JSON.stringify(url);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirecting…</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; background: #faf8f4; color: #1a1a1a; }
    p { font-size: 15px; }
  </style>
</head>
<body>
  <p>Connected. Returning to socialHyve…</p>
  <script>
    setTimeout(function () { window.location.replace(${safeUrl}); }, ${delayMs});
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
