import { allowedRequest, json } from "./_shared.mjs";

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Método não permitido." }, 405, { Allow: "GET" });
  if (!allowedRequest(request)) return json({ error: "Origem da solicitação não permitida." }, 403);

  const url = new URL(request.url);
  const term = (url.searchParams.get("term") || "").trim();
  if (!term || new TextEncoder().encode(term).length > 100 || /[\u0000-\u001f]/.test(term)) {
    return json({ error: "Informe uma palavra de até 100 bytes." }, 400);
  }

  try {
    const lookup = new URL("https://pt.wiktionary.org/w/api.php");
    lookup.searchParams.set("action", "query");
    lookup.searchParams.set("prop", "extracts");
    lookup.searchParams.set("explaintext", "1");
    lookup.searchParams.set("exsentences", "4");
    lookup.searchParams.set("redirects", "1");
    lookup.searchParams.set("format", "json");
    lookup.searchParams.set("formatversion", "2");
    lookup.searchParams.set("titles", term);

    const response = await fetch(lookup, {
      headers: { Accept: "application/json", "User-Agent": "PRPregacoes/1.0 (dicionario biblico)" },
      signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok) return json({ error: "Não foi possível consultar o dicionário geral agora." }, 502);
    const payload = await response.json().catch(() => ({}));
    const pages = payload && payload.query && Array.isArray(payload.query.pages) ? payload.query.pages : [];
    const page = pages.find(item => item && !item.missing && item.extract);
    if (!page) return json({ term, meaning: null }, 200, { "Cache-Control": "public, max-age=3600" });

    const title = String(page.title || term).slice(0, 160);
    return json({
      term,
      meaning: {
        title,
        extract: String(page.extract || "").slice(0, 3000),
        url: "https://pt.wiktionary.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_"))
      }
    }, 200, { "Cache-Control": "public, max-age=3600" });
  } catch (error) {
    const message = error && error.name === "TimeoutError"
      ? "A consulta ao dicionário geral demorou para responder."
      : "Não foi possível conectar ao dicionário geral.";
    return json({ error: message }, 502);
  }
}

export const config = { path: "/api/dictionary" };
