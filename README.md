# Non-Human Intelligence Reader

React + Vite EPUB reader with Gemini-powered analysis, quiz generation, and lesson planning.

## Local development

### Option 1: Gemini API key

1. Set `GEMINI_API_KEY` in `.env.local`.
2. Run `npm install`.
3. Run `npm run dev`.

This starts:
- Vite on `http://localhost:3000`
- The local API server on `http://localhost:8080`

Vite proxies `/api/*` requests to the local server, so the Gemini key stays server-side.

### Option 2: Vertex AI

For local development against Google Cloud instead of an API key:

1. Run `gcloud auth application-default login`
2. Export:
   - `GOOGLE_GENAI_USE_VERTEXAI=true`
   - `GOOGLE_CLOUD_PROJECT=<your-project-id>`
   - `GOOGLE_CLOUD_LOCATION=global`
3. Run `npm run dev`

## Production

The app is set up for Cloud Run source deployments.

### Deployed service

- URL: [https://nhi-epub-reader-adfhlspmoq-as.a.run.app](https://nhi-epub-reader-adfhlspmoq-as.a.run.app)
- Region: `asia-southeast1`
- Cloud Run service: `nhi-epub-reader`
- Runtime service account: `nhi-epub-reader-run@gen-lang-client-0821037571.iam.gserviceaccount.com`

### Deploy again

```bash
gcloud run deploy nhi-epub-reader \
  --source . \
  --project gen-lang-client-0821037571 \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --service-account nhi-epub-reader-run@gen-lang-client-0821037571.iam.gserviceaccount.com \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=gen-lang-client-0821037571,GOOGLE_CLOUD_LOCATION=global
```

### Required Google Cloud APIs

- `run.googleapis.com`
- `cloudbuild.googleapis.com`
- `artifactregistry.googleapis.com`
- `aiplatform.googleapis.com`
- `iam.googleapis.com`
