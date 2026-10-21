import { allowedRequest, json, readJson, safeEqual, sessionCookie } from "./_shared.mjs";

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405, { Allow: "POST" });
  if (!allowedRequest(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  const password = process.env.APP_ACCESS_PASSWORD || "";
  if (!password) return json({ error: "Configure APP_ACCESS_PASSWORD nos segredos do Netlify." }, 503);
  let payload;
  try { payload = await readJson(request); }
  catch (error) { return json({ error: error.message }, error.status || 400); }
  if (!safeEqual(String(payload && payload.password || ""), password)) {
    return json({ error: "Senha de acesso incorreta." }, 401);
  }
  return json({ authenticated: true, authRequired: true }, 200, { "Set-Cookie": sessionCookie(request) });
}

export const config = { path: "/api/login" };
