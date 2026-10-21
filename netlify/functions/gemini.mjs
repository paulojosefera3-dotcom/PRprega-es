import { allowedRequest, buildSystemInstruction, DRAFT_SCHEMA, json, readJson, requireAuth } from "./_shared.mjs";

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405, { Allow: "POST" });
  if (!allowedRequest(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  const denied = requireAuth(request);
  if (denied) return denied;
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) return json({ error: "Configure GEMINI_API_KEY nos segredos do Netlify." }, 503);

  let payload;
  try { payload = await readJson(request); }
  catch (error) { return json({ error: error.message }, error.status || 400); }

  const message = String(payload && payload.message || "").trim().slice(0, 10_000);
  if (!message) return json({ error: "Escreva uma mensagem antes de enviar." }, 400);
  const isSermon = !!(payload && payload.isSermon);
  const history = Array.isArray(payload && payload.history) ? payload.history.slice(-14) : [];
  const contents = history
    .filter(item => item && (item.role === "user" || item.role === "assistant") && String(item.content || "").trim())
    .map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: String(item.content).slice(0, 6500) }]
    }));
  contents.push({ role: "user", parts: [{ text: message }] });

  const generationConfig = { maxOutputTokens: isSermon ? 5000 : 1400 };
  if (isSermon) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = DRAFT_SCHEMA;
  }
  const requestBody = {
    systemInstruction: { parts: [{ text: buildSystemInstruction(String(payload.localContext || ""), isSermon) }] },
    contents,
    generationConfig
  };

  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(process.env.GEMINI_MODEL || "gemini-3.8-flash") + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(90_000)
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = String(result && result.error && result.error.message || "A API do Gemini recusou a solicitação.").slice(0, 500);
      return json({ error: "Gemini respondeu com erro: " + detail }, upstream.status);
    }
    const parts = result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts;
    const answer = Array.isArray(parts) ? parts.map(part => String(part && part.text || "")).join("").trim() : "";
    if (!answer) return json({ error: "Gemini não retornou texto. Tente novamente ou reformule a mensagem." }, 502);
    if (isSermon) {
      try { return json({ draft: JSON.parse(answer) }); }
      catch { return json({ answer }); }
    }
    return json({ answer });
  } catch (error) {
    const message = error && error.name === "TimeoutError"
      ? "O Gemini demorou para responder. Tente novamente."
      : "Não foi possível alcançar a API do Gemini. Verifique a conexão e tente de novo.";
    return json({ error: message }, 502);
  }
}

export const config = { path: "/api/gemini" };
