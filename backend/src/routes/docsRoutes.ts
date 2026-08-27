import { Router, Request, Response } from 'express';
import { openapiSpec } from '../docs/openapiSpec';

const router = Router();

// Raw JSON OpenAPI specification endpoint
router.get('/spec.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(openapiSpec, null, 2));
});

// Interactive Swagger UI HTML with Tactical Dark Mode
router.get('/', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>UWE Command Center API Docs</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛡️</text></svg>">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #070A11;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .topbar {
      background: #0A0E17 !important;
      border-bottom: 2px solid #FFB800 !important;
      padding: 12px 20px !important;
    }
    .topbar-wrapper img {
      content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFB800"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>');
      height: 32px;
    }
    .swagger-ui .topbar a span {
      color: #FFB800 !important;
      font-weight: 900 !important;
      letter-spacing: 1px;
    }
    .swagger-ui {
      filter: invert(88%) hue-rotate(180deg);
    }
    .swagger-ui .wrapper {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    .custom-banner {
      background: linear-gradient(90deg, #0A0E17, #131927);
      border: 1px solid #FFB800;
      color: #FFB800;
      padding: 12px 24px;
      margin: 20px auto;
      max-width: 1360px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="custom-banner">
    <div>⚡ UWE COMMAND HQ — API SPECIFICATION & LIVE GATEWAY</div>
    <div>VERSION 2.0.0 • OPENAPI 3.0</div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(openapiSpec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
});

export default router;
