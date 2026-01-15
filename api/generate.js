// Vercel serverless function to generate an image using OpenAI's GPT Image API.
//
// This endpoint expects a JSON body with a `prompt` string. It calls the
// OpenAI Image API (`/v1/images/generations`) with the `gpt-image-1` model
// to produce a base64-encoded PNG. The response is normalized to an
// `{ output: [dataUri] }` shape so the frontend can display it directly.
// A valid OPENAI_API_KEY environment variable must be set in your Vercel
// project. See the OpenAI documentation for details on the image API and
// usage of `b64_json`【97483440176682†L430-L470】.

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  // Parse the JSON body manually (Vercel does not parse body by default for
  // raw Node.js functions)
  let rawBody = "";
  try {
    for await (const chunk of req) {
      rawBody += chunk;
    }
  } catch (err) {
    res.status(400).json({ error: "Failed to read request body" });
    return;
  }
  let body;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch (err) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }
  const prompt = body.prompt;
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "A prompt string is required." });
    return;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OpenAI API key is not configured." });
    return;
  }
  try {
    // Call the OpenAI image generation endpoint. See example usage in the
    // OpenAI documentation, which shows that GPT Image models return a
    // `b64_json` field containing base64-encoded image data【97483440176682†L430-L470】.
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        // For GPT image models, base64 format is always returned; no
        // additional parameters are necessary【779316246318052†L296-L307】.
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      // Propagate any error messages from OpenAI
      res.status(response.status).json({ error: data.error?.message || data.error || "OpenAI API error" });
      return;
    }
    // Extract the base64 string from the API response and convert to a data URI.
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      res.status(500).json({ error: "No image returned." });
      return;
    }
    const dataUri = `data:image/png;base64,${b64}`;
    res.status(200).json({ output: [dataUri] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}