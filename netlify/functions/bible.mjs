import { allowedRequest, json } from "./_shared.mjs";

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Método não permitido." }, 405, { Allow: "GET" });
  if (!allowedRequest(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  const apiKey = process.env.BIBLELEXICON_API_KEY || "";
  if (!apiKey) {
    return json({ error: "Para usar a ARA ou a ARC, adicione BIBLELEXICON_API_KEY nos segredos do Netlify e publique um novo deploy." }, 503);
  }

  const url = new URL(request.url);
  const requestedVersion = url.searchParams.get("version") || "arc";
  const version = requestedVersion === "ara" ? "ra" : requestedVersion === "arc" ? "rc" : "";
  if (!version) return json({ error: "Versão bíblica inválida." }, 400);
  if (url.searchParams.get("mode") === "search") {
    const query = (url.searchParams.get("q") || "").trim();
    const page = Number(url.searchParams.get("page") || 1);
    const queryBytes = new TextEncoder().encode(query).length;
    if (query.length < 3 || queryBytes > 32 || /[%_*]/.test(query)) {
      return json({ error: "Use uma busca de 3 a 32 bytes e remova os caracteres %, _ e *." }, 400);
    }
    if (!Number.isInteger(page) || page < 1 || page > 500) {
      return json({ error: "Página inválida." }, 400);
    }

    const searchUrl = new URL("https://biblelexicon.com.br/api/v1/bibles/" + version + "/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("limit", "21");
    searchUrl.searchParams.set("page", String(page));

    try {
      const [upstream, dictionaryResponse] = await Promise.all([
        fetch(searchUrl, {
          method: "GET",
          headers: { Accept: "application/json", "X-API-Key": apiKey },
          signal: AbortSignal.timeout(20_000)
        }),
        fetch((() => {
          const wikiUrl = new URL("https://pt.wiktionary.org/w/api.php");
          wikiUrl.searchParams.set("action", "query");
          wikiUrl.searchParams.set("prop", "extracts");
          wikiUrl.searchParams.set("explaintext", "1");
          wikiUrl.searchParams.set("exsentences", "4");
          wikiUrl.searchParams.set("redirects", "1");
          wikiUrl.searchParams.set("format", "json");
          wikiUrl.searchParams.set("formatversion", "2");
          wikiUrl.searchParams.set("titles", query);
          return wikiUrl;
        })(), {
          method: "GET",
          headers: { Accept: "application/json", "User-Agent": "PRPregacoes/1.0 (dicionario biblico)" },
          signal: AbortSignal.timeout(5_000)
        }).catch(() => null)
      ]);

      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        if (upstream.status === 401) return json({ error: "A chave BibleLexicon está inválida. Confira BIBLELEXICON_API_KEY nos segredos do Netlify." }, 502);
        if (upstream.status === 403) return json({ error: "O plano da BibleLexicon não permite pesquisar essa versão." }, 502);
        if (upstream.status === 429) return json({ error: "A cota da API bíblica foi atingida. Tente novamente mais tarde." }, 429);
        const detail = String(payload && (payload.error || payload.message) || "A busca bíblica não conseguiu carregar.").slice(0, 300);
        return json({ error: detail }, upstream.status >= 500 ? 502 : upstream.status);
      }

      let meaning = null;
      if (dictionaryResponse && dictionaryResponse.ok) {
        const dictionaryPayload = await dictionaryResponse.json().catch(() => ({}));
        const pages = dictionaryPayload && dictionaryPayload.query && Array.isArray(dictionaryPayload.query.pages)
          ? dictionaryPayload.query.pages
          : [];
        const pageData = pages.find(item => item && !item.missing && item.extract);
        if (pageData) {
          const title = String(pageData.title || query).slice(0, 160);
          meaning = {
            extract: String(pageData.extract || "").slice(0, 3000),
            url: "https://pt.wiktionary.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_"))
          };
        }
      }
      return json({ ...payload, meaning });
    } catch (error) {
      const message = error && error.name === "TimeoutError"
        ? "A busca bíblica demorou para responder. Tente novamente."
        : "Não foi possível conectar à busca bíblica. Confira a internet e tente de novo.";
      return json({ error: message }, 502);
    }
  }

  const versionName = version === "ra" ? "ARA" : "ARC";
  const book = Number(url.searchParams.get("book"));
  const chapter = Number(url.searchParams.get("chapter"));
  if (!Number.isInteger(book) || book < 1 || book > 66 || !Number.isInteger(chapter) || chapter < 1 || chapter > 150) {
    return json({ error: "Livro ou capítulo inválido." }, 400);
  }

  try {
    const upstream = await fetch("https://biblelexicon.com.br/api/v1/bibles/" + version + "/" + book + "/" + chapter, {
      method: "GET",
      headers: { Accept: "application/json", "X-API-Key": apiKey },
      signal: AbortSignal.timeout(20_000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      if (upstream.status === 401) return json({ error: "A chave BibleLexicon está inválida. Confira BIBLELEXICON_API_KEY nos segredos do Netlify." }, 502);
      if (upstream.status === 403) return json({ error: "O plano da BibleLexicon não permite consultar a " + versionName + "." }, 502);
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
