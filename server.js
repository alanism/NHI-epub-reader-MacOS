import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');

const app = express();
const port = Number(process.env.PORT || 8080);

app.use(express.json({ limit: '25mb' }));

let aiClient;

const createAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim() || process.env.GCLOUD_PROJECT?.trim();
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'global';
  const useVertex =
    process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' || (!apiKey && Boolean(project));

  if (useVertex) {
    if (!project) {
      throw new Error('GOOGLE_CLOUD_PROJECT is required when using Vertex AI.');
    }

    return new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
  }

  if (!apiKey) {
    throw new Error('Set GEMINI_API_KEY for local development or configure Vertex AI for Cloud Run.');
  }

  return new GoogleGenAI({ apiKey });
};

const getAiClient = () => {
  if (!aiClient) {
    aiClient = createAiClient();
  }

  return aiClient;
};

const ensureString = (value, fieldName) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
};

const handleApiError = (res, error) => {
  console.error(error);
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  res.status(500).json({ error: message });
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { model, text, systemInstruction, temperature } = req.body ?? {};
    ensureString(model, 'model');
    ensureString(text, 'text');
    ensureString(systemInstruction, 'systemInstruction');

    const response = await getAiClient().models.generateContent({
      model,
      contents: text,
      config: {
        systemInstruction,
        temperature,
      },
    });

    res.json({ text: response.text || '' });
  } catch (error) {
    handleApiError(res, error);
  }
});

app.post('/api/quiz', async (req, res) => {
  try {
    const { model, contentPrompt, systemInstruction, responseSchema, temperature } = req.body ?? {};
    ensureString(model, 'model');
    ensureString(contentPrompt, 'contentPrompt');
    ensureString(systemInstruction, 'systemInstruction');

    const response = await getAiClient().models.generateContent({
      model,
      contents: contentPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature,
      },
    });

    const questions = JSON.parse(response.text || '[]');
    res.json({ questions });
  } catch (error) {
    handleApiError(res, error);
  }
});

app.post('/api/lesson-plan', async (req, res) => {
  try {
    const { model, prompt, systemInstruction, temperature } = req.body ?? {};
    ensureString(model, 'model');
    ensureString(prompt, 'prompt');
    ensureString(systemInstruction, 'systemInstruction');

    const response = await getAiClient().models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        temperature,
      },
    });

    res.json({ text: response.text || '' });
  } catch (error) {
    handleApiError(res, error);
  }
});

app.use(express.static(distDir));

app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
