import { MODEL, json, requireAuth } from "./_shared.mjs";

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Método não permitido." }, 405, { Allow: "GET" });
  const denied = requireAuth(request);
  if (denied) return denied;
  return json({ geminiConfigured: !!process.env.GEMINI_API_KEY, model: MODEL });
}

export const config = { path: "/api/config" };
