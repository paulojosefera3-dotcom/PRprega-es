import { allowedRequest, json, requireAuth } from "./_shared.mjs";

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Método não permitido." }, 405, { Allow: "GET" });
  if (!allowedRequest(request)) return json({ error: "Origem da solicitação não permitida." }, 403);
  const denied = requireAuth(request);
  if (denied) return denied;

  const apiKey = process.env.BIBLELEXICON_API_KEY || "";
  if (!apiKey) {
    return json({ error: "Configure BIBLELEXICON_API_KEY nos segredos do Netlify e publique um novo deploy." }, 503);
  }

  const params = new URL(request.url).searchParams;
  const book = Number(params.get("book"));
  const chapter = Number(params.get("chapter"));
  if (!Number.isInteger(book) || book < 1 || book > 66) {
    return json({ error: "Escolha um dos 66 livros da Bíblia." }, 400);
  }
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 150) {
    return json({ error: "O capítulo informado não é válido." }, 400);
  }

  try {
    const upstream = await fetch(
      "https://biblelexicon.com.br/api/v1/bibles/ra/" + book + "/" + chapter,
      {
        headers: { Accept: "application/json", "X-API-Key": apiKey },
        signal: AbortSignal.timeout(20_000)
      }
    );
    const payload = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      const messages = {
        401: "A chave da BibleLexicon está incorreta ou inativa. Confira BIBLELEXICON_API_KEY no Netlify.",
        403: "O plano ou a licença da BibleLexicon não autorizou esta consulta à ARA.",
        404: "Não encontrei esse capítulo na BibleLexicon.",
        429: "O limite de consultas da BibleLexicon foi atingido. Tente mais tarde ou confira seu plano."
      };
      const status = upstream.status === 429 ? 429 : upstream.status === 404 ? 404 : 502;
      return json({ error: messages[upstream.status] || "A BibleLexicon não conseguiu fornecer este capítulo agora." }, status);
    }

    if (!payload || !Array.isArray(payload.verses)) {
      return json({ error: "A resposta da BibleLexicon veio em um formato inesperado." }, 502);
    }

    return json({
      version: payload.version || { code: "ra", name: "Almeida Revista e Atualizada", year: 1993 },
      book_id: payload.book_id || book,
      chapter: payload.chapter || chapter,
      verses: payload.verses,
      copyright: "Almeida Revista e Atualizada (ARA), © 1993 Sociedade Bíblica do Brasil."
    });
  } catch (error) {
    const message = error && error.name === "TimeoutError"
      ? "A BibleLexicon demorou para responder. Tente novamente."
      : "Não foi possível conectar à BibleLexicon. Confira a internet e tente novamente.";
    return json({ error: message }, 502);
  }
}

export const config = { path: "/api/bible" };
