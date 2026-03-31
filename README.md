# getarobot-website-agent

Webhook server + SSE relay for a Retell.ai voice agent that controls a website visitor's browser. The Retell agent calls custom tools (scroll, highlight, show popup), the webhook receives those calls, responds to Retell, and simultaneously pushes the command to the visitor's browser via Server-Sent Events.

## Architecture

```
Visitor browser (Tilda page)
  ├── Retell Web SDK (voice)
  ├── SSE client (listens for commands from our server)
  └── Site Controller JS (executes scroll/highlight/popup)
        ↕ SSE
Webhook Server (Fastify on Cloud Run)
  ├── POST /webhook/retell     — receives Retell tool calls
  ├── GET  /sse/:sessionId     — SSE stream per visitor session
  ├── POST /session/create     — creates a session, returns sessionId
  ├── POST /session/:id/link   — links Retell call_id to session
  ├── POST /retell/create-web-call — proxy to Retell API
  └── GET  /health             — health check
        ↕ HTTP
Retell.ai cloud (sends tool calls, expects JSON response)
```

## Local development

```bash
# Install dependencies
npm install

# Copy env template and fill in your keys
cp .env.example .env

# Start dev server (with auto-reload)
npm run dev
```

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port (default: 8080) | No |
| `RETELL_API_KEY` | Retell.ai API key | Yes |
| `RETELL_AGENT_ID` | Retell agent ID for the website voice agent | Yes |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | Yes |
| `NODE_ENV` | `production` or `development` | No |
| `LOG_LEVEL` | Pino log level (default: `info`) | No |

## Deploy to Cloud Run

```bash
# Direct deploy
gcloud run deploy getarobot-website-agent \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --timeout=600 \
  --set-env-vars "RETELL_API_KEY=xxx,RETELL_AGENT_ID=xxx,ALLOWED_ORIGINS=https://getarobot.ai"

# Or via Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

## Tilda integration

Add an HTML block to your Tilda page with the following code:

```html
<!-- GAR Voice Agent -->
<link rel="stylesheet" href="https://YOUR_CDN/styles.css" />
<script>
  window.__GAR_SERVER_URL = 'https://YOUR_CLOUD_RUN_URL';
</script>
<script src="https://cdn.jsdelivr.net/npm/retell-client-js-sdk@latest/dist/index.umd.min.js"></script>
<script src="https://YOUR_CDN/site-controller.js"></script>
<script src="https://YOUR_CDN/widget.js"></script>
```

Replace `YOUR_CDN` with where you host the client files and `YOUR_CLOUD_RUN_URL` with your deployed server URL.

## Updating section mappings

Edit the `SECTION_MAP` object in `client/site-controller.js` to match your Tilda page's actual element IDs:

```javascript
const SECTION_MAP = {
  home: '#rec123456789',    // Replace with real Tilda rec IDs
  scenarios: '#rec987654321',
  faq: '#rec111222333',
};
```
