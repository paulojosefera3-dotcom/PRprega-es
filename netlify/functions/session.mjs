import { json, sessionStatus } from "./_shared.mjs";

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Método não permitido." }, 405, { Allow: "GET" });
  return json(sessionStatus(request));
}

export const config = { path: "/api/session" };
