const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(message);
}

async function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("O corpo da requisicao ficou grande demais."));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function buildAssistantInstructions(payload) {
  const pageLabel = payload.pageTitle ? `${payload.pageKey || "pagina"} (${payload.pageTitle})` : payload.pageKey || "pagina";

  return [
    "Voce e a Conecta IA, assistente oficial do site Conecta Estagio.",
    "Responda sempre em portugues do Brasil.",
    "Use um tom humano, claro, jovem universitario e acolhedor, sem parecer texto automatico.",
    "Ajude estudantes e recrutadores com portfolio, vagas, area tech, processos seletivos, comunidade, perfis e apresentacao de empresa.",
    `Pagina atual: ${pageLabel}.`,
    payload.pageContext ? `Contexto da pagina: ${payload.pageContext}` : "",
    "O foco atual da plataforma esta em inicio de carreira na area tech, com destaque para front-end, back-end, full stack, dados, suporte e produto digital.",
    "Quando fizer sentido, cite que a ideia pode crescer para outras areas como enfermagem, administracao, logistica, pedagogia, RH e design.",
    "Prefira respostas praticas, objetivas e proximas, normalmente em 3 a 6 frases. Pode usar uma lista curta quando isso ajudar.",
    "Se a pergunta fugir muito do contexto do site, responda de forma breve e tente trazer a conversa de volta para carreira, comunidade ou produto."
  ].filter(Boolean).join("\n");
}

async function getOpenAIResponse(payload) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      status: 503,
      payload: {
        message: "OPENAI_API_KEY nao encontrada no ambiente. O site segue em modo demo ate essa chave ser configurada."
      }
    };
  }

  const requestBody = {
    model: DEFAULT_MODEL,
    instructions: buildAssistantInstructions(payload),
    input: String(payload.message || "").trim(),
    store: true
  };

  if (payload.previousResponseId) {
    requestBody.previous_response_id = payload.previousResponseId;
  }

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  const responseJson = await openAiResponse.json().catch(() => ({}));

  if (!openAiResponse.ok) {
    const message = responseJson?.error?.message || "A OpenAI respondeu com erro ao gerar a resposta da assistente.";
    return {
      status: openAiResponse.status,
      payload: {
        message
      }
    };
  }

  return {
    status: 200,
    payload: {
      output: Array.isArray(responseJson.output) ? responseJson.output : [],
      responseId: responseJson.id || "",
      model: responseJson.model || DEFAULT_MODEL,
      message: `Servidor pronto em ${responseJson.model || DEFAULT_MODEL}.`
    }
  };
}

async function serveFile(requestPath, response) {
  const normalizedPath = decodeURIComponent(requestPath);
  const absolutePath = path.join(ROOT_DIR, normalizedPath);
  const safePath = path.normalize(absolutePath);

  if (!safePath.startsWith(ROOT_DIR)) {
    sendText(response, 403, "Acesso negado.");
    return;
  }

  try {
    let filePath = safePath;
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || "application/octet-stream";
    const buffer = await fs.readFile(filePath);

    response.writeHead(200, {
      "Content-Type": contentType
    });
    response.end(buffer);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendText(response, 404, "Arquivo nao encontrado.");
      return;
    }

    sendText(response, 500, "Nao consegui servir esse arquivo agora.");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      Allow: "GET, POST, OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/conecta-ia/status") {
    sendJson(response, 200, {
      ready: Boolean(process.env.OPENAI_API_KEY),
      model: DEFAULT_MODEL,
      message: process.env.OPENAI_API_KEY
        ? `Servidor local pronto para usar a OpenAI em ${DEFAULT_MODEL}.`
        : "Servidor local ativo, mas sem OPENAI_API_KEY. O site continua em modo demo."
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/conecta-ia") {
    try {
      const rawBody = await readRequestBody(request);
      const payload = rawBody ? JSON.parse(rawBody) : {};

      if (!payload.message || !String(payload.message).trim()) {
        sendJson(response, 400, {
          message: "Escreve uma pergunta antes de chamar a assistente."
        });
        return;
      }

      const openAiResult = await getOpenAIResponse(payload);
      sendJson(response, openAiResult.status, openAiResult.payload);
    } catch (error) {
      sendJson(response, 500, {
        message: "Nao consegui processar essa pergunta agora."
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(302, {
      Location: "/Projeto/index.html"
    });
    response.end();
    return;
  }

  if (request.method === "GET") {
    await serveFile(url.pathname, response);
    return;
  }

  sendText(response, 405, "Metodo nao suportado.");
});

server.listen(PORT, () => {
  console.log(`Conecta Estagio rodando em http://localhost:${PORT}`);
  console.log("Se quiser a Conecta IA em modo real, defina OPENAI_API_KEY antes de iniciar.");
});
