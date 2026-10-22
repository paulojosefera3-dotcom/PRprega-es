import { allowedRequest, json, requireAuth } from "./_shared.mjs";

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Método não permitido." }, 405, { Allow: "GET" });
  if (!allowedRequest(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  const denied = requireAuth(request);
  if (denied) return denied;

  const apiKey = process.env.BIBLELEXICON_API_KEY || "";
  if (!apiKey) {
    return json({ error: "Para usar a ARC, adicione BIBLELEXICON_API_KEY nos segredos do Netlify e publique um novo deploy." }, 503);
  }

  const url = new URL(request.url);
  const book = Number(url.searchParams.get("book"));
  const chapter = Number(url.searchParams.get("chapter"));
  if (!Number.isInteger(book) || book < 1 || book > 66 || !Number.isInteger(chapter) || chapter < 1 || chapter > 150) {
    return json({ error: "Livro ou capítulo inválido." }, 400);
  }

  try {
    const upstream = await fetch("https://biblelexicon.com.br/api/v1/bibles/rc/" + book + "/" + chapter, {
      method: "GET",
      headers: { Accept: "application/json", "X-API-Key": apiKey },
      signal: AbortSignal.timeout(20_000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      if (upstream.status === 401) return json({ error: "A chave BibleLexicon está inválida. Confira BIBLELEXICON_API_KEY nos segredos do Netlify." }, 502);
      if (upstream.status === 403) return json({ error: "O plano da BibleLexicon não permite consultar a ARC." }, 502);
      if (upstream.status === 429) return json({ error: "A cota da API bíblica foi atingida. Tente novamente mais tarde." }, 429);
      const detail = String(payload && (payload.error || payload.message) || "A API bíblica não conseguiu carregar o capítulo.").slice(0, 300);
      return json({ error: detail }, upstream.status >= 500 ? 502 : upstream.status);
    }
    return json(payload);
  } catch (error) {
    const message = error && error.name === "TimeoutError"
      ? "A API bíblica demorou para responder. Tente novamente."
      : "Não foi possível conectar à API bíblica. Confira a internet e tente de novo.";
    return json({ error: message }, 502);
  }
}

export const config = { path: "/api/bible" };
