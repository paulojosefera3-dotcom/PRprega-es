import { allowedRequest, clearedSessionCookie, json } from "./_shared.mjs";

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405, { Allow: "POST" });
  if (!allowedRequest(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  return json({ ok: true }, 200, { "Set-Cookie": clearedSessionCookie(request) });
}

export const config = { path: "/api/logout" };
