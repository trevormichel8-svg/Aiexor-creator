// api/generate.js
//
// Single image-generation endpoint supporting:
// - OpenAI Images API (default) using OPENAI_API_KEY
// - Vertex AI Imagen (provider="vertex") using a Google service account JSON
//
// Frontend sends: { prompt: string, provider?: "openai" | "vertex", vertex?: { model?, location?, aspectRatio?, sampleCount? } }
//
// Vertex AI docs (REST Imagen predict): https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/{MODEL}:predict

import crypto from "node:crypto";
/** @typedef {"openai"|"vertex"} Provider */

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

function json(res, status, body) {
  res.status(status).json(body);
}

async function readJsonBody(req) {
  let rawBody = "";
  for await (const chunk of req) rawBody += chunk;
  try {
    return JSON.parse(rawBody || "{}");
  } catch {
    throw new Error("Invalid JSON");
  }
}

function base64url(input) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signJwtRS256({ header, payload, privateKeyPem }) {
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKeyPem);
  return `${unsigned}.${base64url(signature)}`;
}

function parseServiceAccountJsonFromEnv() {
  const raw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GCP_SERVICE_ACCOUNT_JSON;

  if (!raw) return null;

  // Accept either JSON string or base64-encoded JSON.
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);

  const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
  return JSON.parse(decoded);
}

async function getAccessTokenForServiceAccount(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = signJwtRS256({
    header: { alg: "RS256", typ: "JWT" },
    payload: {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: OAUTH_TOKEN_URL,
      scope: CLOUD_PLATFORM_SCOPE,
      iat: now,
      exp: now + 60 * 55,
    },
    privateKeyPem: serviceAccount.private_key,
  });

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const resp = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data.error_description || data.error || "Failed to mint access token";
    throw new Error(msg);
  }
  if (!data.access_token) throw new Error("No access token returned by Google OAuth");
  return data.access_token;
}

function getVertexConfig(body) {
  const projectId =
    process.env.VERTEX_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.CAIP_PROJECT_ID;

  const location = body?.vertex?.location || process.env.VERTEX_LOCATION || "us-central1";
  const model = body?.vertex?.model || process.env.VERTEX_IMAGEN_MODEL || "imagen-3.0-generate-002";

  const sampleCount = Number(body?.vertex?.sampleCount ?? 1);
  const aspectRatio = body?.vertex?.aspectRatio || "1:1";

  if (!projectId) throw new Error("Vertex project id missing. Set VERTEX_PROJECT_ID (or GOOGLE_CLOUD_PROJECT).");

  return { projectId, location, model, sampleCount, aspectRatio };
}

async function generateWithVertexImagen({ prompt, body }) {
  const serviceAccount = parseServiceAccountJsonFromEnv();
  if (!serviceAccount) {
    throw new Error(
      "Google credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS_JSON (JSON string or base64) to a service account key."
    );
  }

  const token = await getAccessTokenForServiceAccount(serviceAccount);
  const { projectId, location, model, sampleCount, aspectRatio } = getVertexConfig(body);

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;

  const payload = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: Math.min(Math.max(sampleCount, 1), 4),
      aspectRatio,
      // Sensible defaults aligned with the public API reference.
      safetyFilterLevel: "block_medium_and_above",
      personGeneration: "allow_adult",
      outputOptions: { mimeType: "image/png" },
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data.error?.message || data.error || JSON.stringify(data) || "Vertex AI API error";
    throw new Error(msg);
  }

  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("No image returned by Vertex AI.");
  return `data:image/png;base64,${b64}`;
}

async function generateWithOpenAI({ prompt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key is not configured. Set OPENAI_API_KEY.");

  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data.error?.message || data.error || "OpenAI API error";
    throw new Error(msg);
  }
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned by OpenAI.");
  return `data:image/png;base64,${b64}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return json(res, 400, { error: err.message || "Invalid request body" });
  }

  const prompt = body?.prompt;
  if (!prompt || typeof prompt !== "string") return json(res, 400, { error: "A prompt string is required." });

  /** @type {Provider} */
  const provider = (body?.provider || "openai").toLowerCase();

  try {
    const dataUri =
      provider === "vertex"
        ? await generateWithVertexImagen({ prompt, body })
        : await generateWithOpenAI({ prompt });

    return json(res, 200, { output: [dataUri] });
  } catch (err) {
    return json(res, 500, { error: err.message || "Generation failed" });
  }
}
