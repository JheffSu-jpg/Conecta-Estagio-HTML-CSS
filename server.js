const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
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

const AREA_CATALOG = [
  { key: "frontend", label: "Front-end", segment: "Tecnologia" },
  { key: "backend", label: "Back-end", segment: "Tecnologia" },
  { key: "fullstack", label: "Full stack", segment: "Tecnologia" },
  { key: "dados", label: "Dados", segment: "Tecnologia" },
  { key: "suporte", label: "Suporte", segment: "Tecnologia" },
  { key: "produto", label: "Produto digital", segment: "Tecnologia" },
  { key: "design", label: "Design", segment: "Criacao" },
  { key: "enfermagem", label: "Enfermagem", segment: "Saude" },
  { key: "administracao", label: "Administracao", segment: "Negocios" },
  { key: "logistica", label: "Logistica", segment: "Operacoes" },
  { key: "pedagogia", label: "Pedagogia", segment: "Educacao" }
];

let dbCache = null;

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function randomId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function toSentenceCase(value) {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function getAreaMeta(areaKey) {
  return AREA_CATALOG.find((item) => item.key === areaKey) || {
    key: areaKey,
    label: toSentenceCase(areaKey),
    segment: "Geral"
  };
}

function hashPassword(password, salt) {
  return crypto
    .createHash("sha256")
    .update(`${String(password || "")}:${salt}`)
    .digest("hex");
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(12).toString("hex");
  return {
    salt,
    passwordHash: hashPassword(password, salt)
  };
}

function verifyPassword(user, password) {
  return hashPassword(password, user.salt) === user.passwordHash;
}

function assert(condition, message, statusCode = 400) {
  if (!condition) {
    throw new HttpError(statusCode, message);
  }
}

async function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 2_000_000) {
        reject(new HttpError(413, "O corpo da requisicao ficou grande demais."));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readJsonBody(request) {
  const rawBody = await readRequestBody(request);
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw new HttpError(400, "O JSON enviado nao esta valido.");
  }
}

function getAuthToken(request) {
  const authorization = request.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function findUserByToken(db, token) {
  if (!token) return null;
  const session = db.sessions.find((item) => item.token === token);
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId) || null;
}

function requireUser(request, db) {
  const token = getAuthToken(request);
  const user = findUserByToken(db, token);

  if (!user) {
    throw new HttpError(401, "Voce precisa entrar para continuar.");
  }

  return user;
}

function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) {
    throw new HttpError(403, "Esse acesso nao esta liberado para o seu perfil.");
  }
}

function normalizeUrl(value) {
  const text = String(value || "").trim();
  return text || "";
}

function toSkillList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function createSeedDatabase() {
  const createdAt = nowIso();

  const companies = [
    {
      id: "company-orbit-labs",
      slug: "orbit-labs",
      name: "Orbit Labs",
      sector: "Tecnologia educacional",
      areas: ["frontend", "produto", "dados"],
      model: "Hibrido",
      size: "65 pessoas",
      location: "Sao Paulo, SP",
      website: "https://www.orbitlabs.com.br",
      linkedin: "https://www.linkedin.com/company/orbit-labs",
      image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      summary:
        "A Orbit Labs cria produtos para melhorar a jornada de estudantes e equipes academicas, com bastante troca entre design, produto e desenvolvimento.",
      story:
        "O time cresceu construindo plataformas para organizacao academica, onboarding e acompanhamento de trilhas de aprendizagem.",
      culture:
        "Ambiente colaborativo, com feedback frequente, onboarding guiado e espaco para quem esta no inicio de carreira aprender sem medo.",
      proposal:
        "Boa porta de entrada para quem quer entrar em produto digital, front-end e leitura de dados com contexto real de negocio.",
      highlights: [
        "Projetos reais desde a primeira semana.",
        "Mentoria proxima para pessoas em inicio de carreira.",
        "Time mistura produto, engenharia e dados no mesmo fluxo."
      ]
    },
    {
      id: "company-pixel-room",
      slug: "pixel-room",
      name: "Pixel Room",
      sector: "Studio de produto e e-commerce",
      areas: ["frontend", "design", "produto"],
      model: "Remoto",
      size: "32 pessoas",
      location: "Remoto",
      website: "https://www.pixelroom.com",
      linkedin: "https://www.linkedin.com/company/pixel-room",
      image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
      summary:
        "A Pixel Room trabalha com produtos digitais e projetos visuais para marcas que vendem online, com foco em interface e performance.",
      story:
        "O studio nasceu em design, ganhou estrutura de produto e hoje mistura discovery, interface e desenvolvimento front-end.",
      culture:
        "Rotina enxuta, bastante troca entre design e codigo, e um cuidado grande com apresentacao visual.",
      proposal:
        "Boa escolha para quem quer crescer em front-end com repertorio de componente, e-commerce e experiencia mobile.",
      highlights: [
        "Review de layout e codigo no mesmo processo.",
        "Projetos para web, app e paginas de produto.",
        "Espaco forte para pessoas com olhar visual."
      ]
    },
    {
      id: "company-base-digital",
      slug: "base-digital",
      name: "Base Digital",
      sector: "Operacao e suporte web",
      areas: ["suporte", "backend", "logistica"],
      model: "Presencial",
      size: "80 pessoas",
      location: "Guarulhos, SP",
      website: "https://www.basedigital.com.br",
      linkedin: "https://www.linkedin.com/company/base-digital",
      image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
      summary:
        "A Base Digital atende operacao web e suporte para times que precisam de velocidade no dia a dia.",
      story:
        "O negocio cresceu organizando atendimento tecnico, fluxos internos e operacao digital para marcas em crescimento.",
      culture:
        "Ritmo pratico, processo bem guiado e muito apoio no onboarding para quem esta entrando.",
      proposal:
        "Boa entrada para quem quer aprender sistema, atendimento, operacao e rotina real de plataforma.",
      highlights: [
        "Onboarding guiado.",
        "Contato com atendimento, sistema e indicadores.",
        "Espaco para crescer em suporte e operacao."
      ]
    },
    {
      id: "company-clinicare",
      slug: "clinicare",
      name: "CliniCare",
      sector: "Saude e atendimento clinico",
      areas: ["enfermagem", "administracao"],
      model: "Hibrido",
      size: "120 pessoas",
      location: "Campinas, SP",
      website: "https://www.clinicare.com.br",
      linkedin: "https://www.linkedin.com/company/clinicare",
      image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
      summary:
        "A CliniCare cuida da experiencia de pacientes e da rotina operacional de clinicas com foco em acolhimento, eficiencia e cuidado.",
      story:
        "A empresa cresceu digitalizando rotinas de atendimento e abrindo espaco para equipes administrativas e assistenciais trabalharem melhor juntas.",
      culture:
        "Rotina acolhedora, foco em processo e bastante clareza para quem esta entrando pela primeira vez no ambiente clinico.",
      proposal:
        "Bom lugar para iniciar em enfermagem administrativa, recepcao clinica e operacao de cuidado.",
      highlights: [
        "Treinamento acompanhado para quem esta no inicio.",
        "Equipe mistura atendimento, enfermagem e administrativo.",
        "Escala organizada e onboarding bem detalhado."
      ]
    },
    {
      id: "company-ponte-gestao",
      slug: "ponte-gestao",
      name: "Ponte Gestao",
      sector: "Consultoria e administracao",
      areas: ["administracao", "logistica"],
      model: "Hibrido",
      size: "45 pessoas",
      location: "Belo Horizonte, MG",
      website: "https://www.pontegestao.com.br",
      linkedin: "https://www.linkedin.com/company/ponte-gestao",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
      summary:
        "A Ponte Gestao organiza processos internos, atendimento e indicadores para pequenas empresas em fase de crescimento.",
      story:
        "O time atua com administrativo, financeiro, operacao e melhoria continua para empresas de servicos.",
      culture:
        "Ambiente muito organizado, com boa rotina de acompanhamento e espaco para aprender processo de verdade.",
      proposal:
        "Boa porta para administracao, operacao e logistica em inicio de carreira.",
      highlights: [
        "Contato com processos reais de negocio.",
        "Trilha de onboarding com apoio semanal.",
        "Boa visao de operacao e administrativo."
      ]
    },
    {
      id: "company-rota-norte",
      slug: "rota-norte",
      name: "Rota Norte",
      sector: "Logistica e distribuicao",
      areas: ["logistica", "administracao"],
      model: "Presencial",
      size: "150 pessoas",
      location: "Contagem, MG",
      website: "https://www.rotanorte.com.br",
      linkedin: "https://www.linkedin.com/company/rota-norte",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
      summary:
        "A Rota Norte atua com roteirizacao, operacao de frota e acompanhamento de entrega para redes varejistas.",
      story:
        "A empresa abriu trilhas para estudantes entrarem em operacao, analise de rota e apoio administrativo.",
      culture:
        "Ritmo pratico, rotina intensa e muita proximidade com lideranca operacional.",
      proposal:
        "Bom lugar para quem quer aprender logistica, distribuicao e leitura de processo.",
      highlights: [
        "Contato com indicadores e operacao diaria.",
        "Rotina presencial com acompanhamento proximo.",
        "Espaco para crescer em logistica e planejamento."
      ]
    },
    {
      id: "company-escola-viva",
      slug: "escola-viva",
      name: "Escola Viva",
      sector: "Educacao e projetos pedagogicos",
      areas: ["pedagogia", "administracao"],
      model: "Presencial",
      size: "70 pessoas",
      location: "Curitiba, PR",
      website: "https://www.escolaviva.com.br",
      linkedin: "https://www.linkedin.com/company/escola-viva",
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
      summary:
        "A Escola Viva une projetos pedagogicos, rotina academica e apoio administrativo em um fluxo bem integrado.",
      story:
        "O time abriu espaco para estudantes de pedagogia, licenciaturas e administrativo apoiarem projetos e vivencia escolar.",
      culture:
        "Ambiente acolhedor, rotina organizada e muita troca com coordenacao pedagogica.",
      proposal:
        "Boa oportunidade para quem quer entrar na rotina escolar com acompanhamento e aprendizado pratico.",
      highlights: [
        "Contato com planejamento pedagogico.",
        "Boa troca com coordenacao e apoio escolar.",
        "Escopo claro para estudantes de educacao."
      ]
    }
  ];

  const studentRecords = [
    {
      id: "student-larissa-m",
      name: "Larissa M.",
      email: "larissa@conecta.dev",
      password: "123456",
      phone: "(11) 98888-1100",
      course: "Analise e Desenvolvimento de Sistemas",
      preferredArea: "frontend",
      city: "Sao Paulo, SP",
      headline: "Estudante de ADS focada em front-end e experiencia de interface.",
      bio:
        "Gosto de construir interfaces claras, pensar em responsividade e transformar requisitos em experiencias mais organizadas para quem usa.",
      skills: ["HTML", "CSS", "JavaScript", "React", "Figma"],
      portfolioUrl: "https://github.com/larissam",
      linkedinUrl: "https://www.linkedin.com/in/larissam",
      goal: "Quero minha primeira oportunidade em front-end para fortalecer repertorio de componente e produto.",
      availability: "Noite e remoto",
      favorites: ["job-pixel-frontend", "job-loop-produto"],
      history: [
        { jobId: "job-pixel-frontend", viewedAt: "2026-05-08T14:10:00.000Z" },
        { jobId: "job-orbit-fullstack", viewedAt: "2026-05-07T18:30:00.000Z" },
        { jobId: "job-clinicare-admin", viewedAt: "2026-05-07T17:00:00.000Z" }
      ]
    },
    {
      id: "student-rafael-s",
      name: "Rafael S.",
      email: "rafael@conecta.dev",
      password: "123456",
      phone: "(31) 97777-2211",
      course: "Sistemas de Informacao",
      preferredArea: "produto",
      city: "Belo Horizonte, MG",
      headline: "Estudante de SI com boa comunicacao, organizacao e interesse por produto digital.",
      bio:
        "Tenho facilidade para organizar fluxo, traduzir contexto de negocio e conectar design, produto e desenvolvimento.",
      skills: ["Pesquisa", "Notion", "Figma", "Roadmap", "Comunicacao"],
      portfolioUrl: "https://github.com/rafaels",
      linkedinUrl: "https://www.linkedin.com/in/rafaels",
      goal: "Quero entrar em produto ou operacao digital com contato real com time e processo.",
      availability: "Tarde e hibrido",
      favorites: ["job-loop-produto"],
      history: [
        { jobId: "job-loop-produto", viewedAt: "2026-05-08T13:55:00.000Z" },
        { jobId: "job-ponte-admin", viewedAt: "2026-05-06T10:15:00.000Z" }
      ]
    },
    {
      id: "student-camila-t",
      name: "Camila T.",
      email: "camila@conecta.dev",
      password: "123456",
      phone: "(21) 96666-3344",
      course: "Design Digital",
      preferredArea: "design",
      city: "Rio de Janeiro, RJ",
      headline: "Estudante de design com interesse em UI, produto e apresentacao visual.",
      bio:
        "Curto organizar interface, sistema visual e historias de projeto mais objetivas, sempre pensando em clareza e consistencia.",
      skills: ["UI", "Design system", "Figma", "Prototipacao", "UX writing"],
      portfolioUrl: "https://www.behance.net/camilat",
      linkedinUrl: "https://www.linkedin.com/in/camilat",
      goal: "Busco uma oportunidade em design de produto ou UI para crescer com time multidisciplinar.",
      availability: "Integral",
      favorites: ["job-pixel-design"],
      history: [
        { jobId: "job-pixel-design", viewedAt: "2026-05-08T11:20:00.000Z" },
        { jobId: "job-orbit-frontend", viewedAt: "2026-05-04T16:20:00.000Z" }
      ]
    },
    {
      id: "student-mateus-a",
      name: "Mateus A.",
      email: "mateus@conecta.dev",
      password: "123456",
      phone: "(19) 95555-4466",
      course: "Enfermagem",
      preferredArea: "enfermagem",
      city: "Campinas, SP",
      headline: "Estudante de enfermagem interessado em acolhimento, rotina clinica e organizacao de atendimento.",
      bio:
        "Tenho interesse em processos de triagem, recepcao clinica e melhoria da experiencia do paciente no fluxo de cuidado.",
      skills: ["Triagem", "Atendimento", "Organizacao", "Rotina clinica"],
      portfolioUrl: "",
      linkedinUrl: "https://www.linkedin.com/in/mateusa",
      goal: "Quero entrar em uma equipe de saude que ofereca treinamento e acompanhamento de rotina.",
      availability: "Manha",
      favorites: ["job-clinicare-enfermagem"],
      history: [
        { jobId: "job-clinicare-enfermagem", viewedAt: "2026-05-08T08:40:00.000Z" }
      ]
    },
    {
      id: "student-bianca-r",
      name: "Bianca R.",
      email: "bianca@conecta.dev",
      password: "123456",
      phone: "(41) 94444-5533",
      course: "Pedagogia",
      preferredArea: "pedagogia",
      city: "Curitiba, PR",
      headline: "Estudante de pedagogia com interesse em rotina escolar, apoio de sala e projetos educacionais.",
      bio:
        "Gosto de acompanhar planejamento, organizar materiais e ajudar a transformar a rotina pedagogica em experiencias mais acolhedoras.",
      skills: ["Planejamento", "Apoio escolar", "Escuta", "Organizacao"],
      portfolioUrl: "",
      linkedinUrl: "https://www.linkedin.com/in/biancar",
      goal: "Busco uma primeira experiencia em educacao com acompanhamento proximo e espaco para aprender na pratica.",
      availability: "Tarde",
      favorites: ["job-escola-pedagogia"],
      history: [
        { jobId: "job-escola-pedagogia", viewedAt: "2026-05-05T09:10:00.000Z" }
      ]
    }
  ];

  const recruiterRecords = [
    {
      id: "recruiter-orbit",
      name: "Marina Alves",
      email: "rh@orbitlabs.com",
      password: "123456",
      phone: "(11) 97711-2000",
      companyId: "company-orbit-labs"
    },
    {
      id: "recruiter-clinicare",
      name: "Helena Nunes",
      email: "talentos@clinicare.com.br",
      password: "123456",
      phone: "(19) 93333-0001",
      companyId: "company-clinicare"
    }
  ];

  const jobs = [
    {
      id: "job-pixel-frontend",
      slug: "estagio-frontend-pixel-room",
      companyId: "company-pixel-room",
      recruiterId: "recruiter-orbit",
      title: "Estagio Front-end",
      primaryArea: "frontend",
      areaKeys: ["frontend"],
      segment: "Tecnologia",
      level: "Estagio",
      model: "Remoto",
      location: "Brasil",
      status: "open",
      createdAt,
      image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Boa para quem esta estudando HTML, CSS e JavaScript e quer ganhar mais repertorio de interface.",
      description:
        "A pessoa vai apoiar a construcao de componentes, paginas de produto e ajustes de experiencia mobile dentro do time de front-end da Pixel Room.",
      requirements: ["Base em HTML, CSS e JavaScript", "Interesse em componentes e responsividade", "Vontade de aprender com revisao de codigo"],
      highlights: ["Mentoria de front-end", "Projetos para e-commerce", "Contato diario com design"],
      stack: ["HTML", "CSS", "JavaScript", "React"],
      link: "https://www.pixelroom.com/carreiras/frontend"
    },
    {
      id: "job-orbit-fullstack",
      slug: "estagio-fullstack-orbit-labs",
      companyId: "company-orbit-labs",
      recruiterId: "recruiter-orbit",
      title: "Estagio Full stack",
      primaryArea: "fullstack",
      areaKeys: ["frontend", "backend", "fullstack"],
      segment: "Tecnologia",
      level: "Estagio",
      model: "Hibrido",
      location: "Sao Paulo, SP",
      status: "pending",
      createdAt,
      image: "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Ideal para quem curte mexer em tela e tambem quer se sentir confortavel com regra e integracao.",
      description:
        "A vaga mistura interface, consumo de API, manutencao de regra simples e acompanhamento de sprint com produto.",
      requirements: ["Base em JavaScript", "Interesse em API e interface", "Organizacao para aprender em contexto real"],
      highlights: ["Projeto educacional real", "Contato com produto e dados", "Onboarding guiado"],
      stack: ["JavaScript", "Node", "React", "REST"],
      link: "https://www.orbitlabs.com.br/carreiras/fullstack"
    },
    {
      id: "job-axis-dados",
      slug: "estagio-dados-axis-cloud",
      companyId: "company-orbit-labs",
      recruiterId: "recruiter-orbit",
      title: "Dados para operacao",
      primaryArea: "dados",
      areaKeys: ["dados"],
      segment: "Tecnologia",
      level: "Estagio",
      model: "Remoto",
      location: "Brasil",
      status: "filled",
      createdAt,
      image: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Leitura de indicadores, apoio em dashboards e contato com time de negocio e atendimento.",
      description:
        "A pessoa acompanha indicadores de operacao, organiza dados em paines simples e conversa com produto e atendimento.",
      requirements: ["Curiosidade analitica", "Base em planilha ou SQL", "Interesse em dashboard e indicadores"],
      highlights: ["Contato com dados de produto", "Leitura de indicadores reais", "Trilha de aprendizagem estruturada"],
      stack: ["SQL", "Planilhas", "Dashboard"],
      link: "https://www.linkedin.com/jobs/view/axis-cloud-dados"
    },
    {
      id: "job-base-suporte",
      slug: "suporte-web-junior-base-digital",
      companyId: "company-base-digital",
      recruiterId: "recruiter-orbit",
      title: "Suporte Web Junior",
      primaryArea: "suporte",
      areaKeys: ["suporte"],
      segment: "Tecnologia",
      level: "Junior",
      model: "Presencial",
      location: "Guarulhos, SP",
      status: "open",
      createdAt,
      image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Entrada boa para quem quer tecnologia com atendimento, sistema interno e base operacional.",
      description:
        "O trabalho mistura atendimento, registro de chamados, leitura de problema e apoio ao time tecnico em rotinas do dia a dia.",
      requirements: ["Boa comunicacao", "Paciencia com processo", "Interesse em sistema e operacao"],
      highlights: ["Onboarding guiado", "Contato com time tecnico", "Ritmo de operacao real"],
      stack: ["Help desk", "Atendimento", "Sistema interno"],
      link: "https://www.basedigital.com.br/talentos"
    },
    {
      id: "job-loop-produto",
      slug: "estagio-produto-digital-loop-studio",
      companyId: "company-pixel-room",
      recruiterId: "recruiter-orbit",
      title: "Estagio em Produto Digital",
      primaryArea: "produto",
      areaKeys: ["produto", "design"],
      segment: "Tecnologia",
      level: "Estagio",
      model: "Remoto",
      location: "Brasil",
      status: "open",
      createdAt,
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Boa para quem gosta de pesquisa, organizacao de backlog e conversa entre design, negocio e dev.",
      description:
        "A pessoa acompanha discovery, escreve resumos de reuniao, organiza backlog e ajuda o time a manter o fluxo mais claro.",
      requirements: ["Boa escrita", "Interesse em produto", "Organizacao de contexto e tarefas"],
      highlights: ["Contato com discovery", "Projeto digital real", "Troca com design e desenvolvimento"],
      stack: ["Notion", "Roadmap", "Figma"],
      link: "https://www.linkedin.com/jobs/view/loop-produto"
    },
    {
      id: "job-pixel-design",
      slug: "estagio-ui-pixel-room",
      companyId: "company-pixel-room",
      recruiterId: "recruiter-orbit",
      title: "Estagio em UI e Design Digital",
      primaryArea: "design",
      areaKeys: ["design", "produto"],
      segment: "Criacao",
      level: "Estagio",
      model: "Remoto",
      location: "Brasil",
      status: "open",
      createdAt,
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Boa para quem quer crescer em interface, sistema visual e apresentacao de projeto.",
      description:
        "A vaga mistura organizacao de tela, sistema visual, refinamento de interface e apoio em handoff com front-end.",
      requirements: ["Base em Figma", "Interesse em UI", "Boa apresentacao de processo"],
      highlights: ["Review de layout", "Troca diaria com front-end", "Espaco para portfolio"],
      stack: ["Figma", "UI", "Design system"],
      link: "https://www.pixelroom.com/carreiras/ui"
    },
    {
      id: "job-clinicare-enfermagem",
      slug: "estagio-enfermagem-clinicare",
      companyId: "company-clinicare",
      recruiterId: "recruiter-clinicare",
      title: "Estagio em Enfermagem de Apoio",
      primaryArea: "enfermagem",
      areaKeys: ["enfermagem"],
      segment: "Saude",
      level: "Estagio",
      model: "Hibrido",
      location: "Campinas, SP",
      status: "open",
      createdAt,
      image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Boa porta de entrada para rotina clinica, triagem e organizacao de atendimento com acompanhamento proximo.",
      description:
        "A pessoa vai apoiar a recepcao clinica, acompanhar rotina de triagem e aprender o fluxo de atendimento com time assistencial.",
      requirements: ["Cursando Enfermagem", "Interesse em acolhimento e rotina clinica", "Organizacao e escuta"],
      highlights: ["Treinamento acompanhado", "Contato com equipe clinica", "Escala organizada"],
      stack: ["Triagem", "Atendimento", "Rotina clinica"],
      link: "https://www.clinicare.com.br/carreiras/enfermagem"
    },
    {
      id: "job-clinicare-admin",
      slug: "estagio-administracao-clinicare",
      companyId: "company-clinicare",
      recruiterId: "recruiter-clinicare",
      title: "Estagio em Administracao Clinica",
      primaryArea: "administracao",
      areaKeys: ["administracao"],
      segment: "Saude",
      level: "Estagio",
      model: "Hibrido",
      location: "Campinas, SP",
      status: "open",
      createdAt,
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Apoio em agenda, recepcao, rotinas administrativas e organizacao do fluxo de pacientes.",
      description:
        "A vaga mistura rotina administrativa, apoio de agenda, recepcao e leitura basica de processo interno.",
      requirements: ["Cursando Administracao ou areas proximas", "Boa organizacao", "Cuidado com atendimento"],
      highlights: ["Aprendizado em rotina de clinica", "Contato com recepcao e operacao", "Ambiente acolhedor"],
      stack: ["Agenda", "Recepcao", "Organizacao"],
      link: "https://www.clinicare.com.br/carreiras/administracao"
    },
    {
      id: "job-ponte-admin",
      slug: "estagio-administracao-ponte-gestao",
      companyId: "company-ponte-gestao",
      recruiterId: "recruiter-clinicare",
      title: "Estagio em Administracao e Processos",
      primaryArea: "administracao",
      areaKeys: ["administracao", "logistica"],
      segment: "Negocios",
      level: "Estagio",
      model: "Hibrido",
      location: "Belo Horizonte, MG",
      status: "open",
      createdAt,
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Boa entrada para quem quer aprender fluxo administrativo, processo interno e organizacao de rotina de negocio.",
      description:
        "A pessoa ajuda a organizar processos, indicadores e rotinas operacionais dentro da consultoria.",
      requirements: ["Boa organizacao", "Interesse em processo", "Cuidado com planilha e rotina"],
      highlights: ["Contato com consultoria", "Fluxo administrativo real", "Acompanhamento semanal"],
      stack: ["Planilhas", "Processos", "Rotina administrativa"],
      link: "https://www.pontegestao.com.br/carreiras/estagio-processos"
    },
    {
      id: "job-rota-logistica",
      slug: "estagio-logistica-rota-norte",
      companyId: "company-rota-norte",
      recruiterId: "recruiter-clinicare",
      title: "Estagio em Logistica de Operacao",
      primaryArea: "logistica",
      areaKeys: ["logistica"],
      segment: "Operacoes",
      level: "Estagio",
      model: "Presencial",
      location: "Contagem, MG",
      status: "open",
      createdAt,
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Leitura de rota, apoio em indicadores e acompanhamento da rotina operacional com lideranca proxima.",
      description:
        "A pessoa participa da rotina de distribuicao, acompanha painel simples de entrega e organiza o fluxo com supervisao.",
      requirements: ["Interesse em operacao", "Boa organizacao", "Disposicao para rotina presencial"],
      highlights: ["Contato com frota e operacao", "Indicadores simples", "Aprendizado pratico"],
      stack: ["Roteirizacao", "Operacao", "Indicadores"],
      link: "https://www.rotanorte.com.br/carreiras/logistica"
    },
    {
      id: "job-escola-pedagogia",
      slug: "estagio-pedagogia-escola-viva",
      companyId: "company-escola-viva",
      recruiterId: "recruiter-clinicare",
      title: "Estagio em Pedagogia e Apoio Escolar",
      primaryArea: "pedagogia",
      areaKeys: ["pedagogia"],
      segment: "Educacao",
      level: "Estagio",
      model: "Presencial",
      location: "Curitiba, PR",
      status: "open",
      createdAt,
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
      summary:
        "Boa para quem quer acompanhar rotina de sala, apoio pedagogico e planejamento escolar com supervisao.",
      description:
        "A pessoa ajuda em rotina escolar, apoio de sala, organizacao de materiais e projetos de coordenacao pedagogica.",
      requirements: ["Cursando Pedagogia", "Escuta e organizacao", "Interesse em rotina escolar"],
      highlights: ["Acompanhamento proximo", "Contato com coordenacao", "Vivencia escolar real"],
      stack: ["Apoio escolar", "Planejamento", "Rotina pedagogica"],
      link: "https://www.escolaviva.com.br/carreiras/pedagogia"
    }
  ];

  const users = [
    ...studentRecords.map((record) => {
      const passwordRecord = createPasswordRecord(record.password);
      return {
        id: record.id,
        role: "student",
        name: record.name,
        email: record.email.toLowerCase(),
        phone: record.phone,
        course: record.course,
        preferredArea: record.preferredArea,
        city: record.city,
        headline: record.headline,
        bio: record.bio,
        skills: record.skills,
        portfolioUrl: record.portfolioUrl,
        linkedinUrl: record.linkedinUrl,
        goal: record.goal,
        availability: record.availability,
        favorites: record.favorites,
        history: record.history,
        createdAt,
        ...passwordRecord
      };
    }),
    ...recruiterRecords.map((record) => {
      const passwordRecord = createPasswordRecord(record.password);
      return {
        id: record.id,
        role: "recruiter",
        name: record.name,
        email: record.email.toLowerCase(),
        phone: record.phone,
        companyId: record.companyId,
        createdAt,
        ...passwordRecord
      };
    })
  ];

  return {
    meta: {
      createdAt,
      updatedAt: createdAt
    },
    companies,
    jobs,
    users,
    sessions: []
  };
}

async function loadDb() {
  if (dbCache) return dbCache;

  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    dbCache = JSON.parse(raw);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    dbCache = createSeedDatabase();
    await saveDb(dbCache);
  }

  return dbCache;
}

async function saveDb(db) {
  db.meta.updatedAt = nowIso();
  dbCache = db;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
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
    "A plataforma ja comeca a expandir para alem da tecnologia, com vagas e empresas em enfermagem, administracao, logistica, pedagogia e design.",
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

function sanitizeStudent(user) {
  const areaMeta = getAreaMeta(user.preferredArea);

  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    course: user.course,
    preferredArea: user.preferredArea,
    preferredAreaLabel: areaMeta.label,
    segment: areaMeta.segment,
    city: user.city || "",
    headline: user.headline || "",
    bio: user.bio || "",
    skills: Array.isArray(user.skills) ? user.skills : [],
    portfolioUrl: user.portfolioUrl || "",
    linkedinUrl: user.linkedinUrl || "",
    goal: user.goal || "",
    availability: user.availability || "",
    favorites: Array.isArray(user.favorites) ? [...user.favorites] : [],
    history: Array.isArray(user.history) ? [...user.history] : [],
    profileUrl: `/Projeto/perfil-estudante.html?id=${user.id}`
  };
}

function sanitizeRecruiter(user, db) {
  const company = db.companies.find((item) => item.id === user.companyId) || null;

  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    companyId: user.companyId,
    companyName: company ? company.name : "",
    dashboardUrl: "/Projeto/dashboard-recrutador.html"
  };
}

function sanitizeUser(user, db) {
  return user.role === "student" ? sanitizeStudent(user) : sanitizeRecruiter(user, db);
}

function serializeCompany(company, db, options = {}) {
  const companyJobs = db.jobs.filter((job) => job.companyId === company.id);
  const openJobs = companyJobs.filter((job) => job.status === "open").length;

  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    sector: company.sector,
    areas: company.areas,
    areaLabels: company.areas.map((areaKey) => getAreaMeta(areaKey).label),
    model: company.model,
    size: company.size,
    location: company.location,
    website: company.website,
    linkedin: company.linkedin,
    image: company.image,
    summary: company.summary,
    story: options.includeStory ? company.story : company.summary,
    culture: options.includeStory ? company.culture : "",
    proposal: options.includeStory ? company.proposal : "",
    highlights: options.includeStory ? company.highlights : [],
    openJobs,
    detailUrl: `/Projeto/empresa.html?id=${company.id}`
  };
}

function serializeJob(job, db, options = {}) {
  const company = db.companies.find((item) => item.id === job.companyId);
  const areaMeta = getAreaMeta(job.primaryArea);

  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    companyId: job.companyId,
    company: company ? serializeCompany(company, db, {}) : null,
    recruiterId: job.recruiterId,
    primaryArea: job.primaryArea,
    primaryAreaLabel: areaMeta.label,
    areaKeys: Array.isArray(job.areaKeys) ? [...job.areaKeys] : [job.primaryArea],
    segment: job.segment || areaMeta.segment,
    level: job.level,
    model: job.model,
    location: job.location,
    status: job.status,
    createdAt: job.createdAt,
    image: job.image,
    summary: job.summary,
    description: options.full ? job.description : "",
    requirements: options.full ? [...(job.requirements || [])] : [],
    highlights: options.full ? [...(job.highlights || [])] : [],
    stack: [...(job.stack || [])],
    link: job.link,
    detailUrl: `/Projeto/vaga.html?id=${job.id}`
  };
}

function serializeStudentList(db, options = {}) {
  return db.users
    .filter((user) => user.role === "student")
    .map((user) => sanitizeStudent(user))
    .filter((student) => {
      const search = String(options.search || "").trim().toLowerCase();
      const area = String(options.area || "").trim().toLowerCase();

      const matchesArea = !area || area === "todos" || student.preferredArea === area;
      if (!matchesArea) return false;
      if (!search) return true;

      const haystack = [
        student.name,
        student.course,
        student.headline,
        student.bio,
        student.preferredAreaLabel,
        ...(student.skills || [])
      ].join(" ").toLowerCase();

      return haystack.includes(search);
    });
}

function createSession(db, userId) {
  const token = randomToken();
  db.sessions = db.sessions.filter((session) => session.userId !== userId);
  db.sessions.push({
    token,
    userId,
    createdAt: nowIso()
  });
  return token;
}

function removeSession(db, token) {
  db.sessions = db.sessions.filter((session) => session.token !== token);
}

function getStudentFavorites(user, db) {
  return (user.favorites || [])
    .map((jobId) => db.jobs.find((job) => job.id === jobId))
    .filter(Boolean)
    .map((job) => serializeJob(job, db, {}));
}

function getStudentHistory(user, db) {
  return (user.history || [])
    .map((entry) => {
      const job = db.jobs.find((item) => item.id === entry.jobId);
      if (!job) return null;

      return {
        job: serializeJob(job, db, {}),
        viewedAt: entry.viewedAt
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.viewedAt) - new Date(left.viewedAt));
}

function getRecommendedJobs(user, db) {
  return db.jobs
    .filter((job) => job.status === "open")
    .filter((job) => {
      const matchesArea = job.primaryArea === user.preferredArea || (job.areaKeys || []).includes(user.preferredArea);
      return matchesArea || job.segment === getAreaMeta(user.preferredArea).segment;
    })
    .slice(0, 6)
    .map((job) => serializeJob(job, db, {}));
}

function computeRecruiterDashboard(user, db) {
  const company = db.companies.find((item) => item.id === user.companyId);
  const jobs = db.jobs.filter((job) => job.companyId === user.companyId);
  const studentUsers = db.users.filter((item) => item.role === "student");

  const views = studentUsers.flatMap((student) => student.history || []).filter((entry) => jobs.some((job) => job.id === entry.jobId));
  const accessed = views.length;
  const filled = jobs.filter((job) => job.status === "filled").length;
  const pending = jobs.filter((job) => job.status === "pending").length;
  const open = jobs.filter((job) => job.status === "open").length;

  const topAreaCounts = jobs.reduce((accumulator, job) => {
    accumulator[job.primaryArea] = (accumulator[job.primaryArea] || 0) + 1;
    return accumulator;
  }, {});

  const matchingStudents = serializeStudentList(db, {})
    .map((student) => {
      const score = jobs.reduce((total, job) => total + ((job.areaKeys || []).includes(student.preferredArea) ? 3 : 0), 0)
        + (student.portfolioUrl ? 2 : 0)
        + ((student.skills || []).length > 3 ? 1 : 0);

      return {
        ...student,
        score
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  return {
    company: company ? serializeCompany(company, db, { includeStory: true }) : null,
    recruiter: sanitizeRecruiter(user, db),
    metrics: {
      totalJobs: jobs.length,
      open,
      filled,
      pending,
      accessed,
      favoriteHits: studentUsers.reduce((total, student) => {
        const favorites = student.favorites || [];
        return total + favorites.filter((jobId) => jobs.some((job) => job.id === jobId)).length;
      }, 0)
    },
    jobs: jobs.map((job) => serializeJob(job, db, { full: true })),
    topStudents: matchingStudents
  };
}

function buildSessionPayload(db, user, token) {
  return {
    token,
    user: sanitizeUser(user, db),
    redirectTo: user.role === "recruiter" ? "/Projeto/dashboard-recrutador.html" : "/Projeto/dashboard.html"
  };
}

async function handleAuthRegister(request, response) {
  const db = await loadDb();
  const body = await readJsonBody(request);

  const role = String(body.role || "").trim().toLowerCase();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();

  assert(role === "student" || role === "recruiter", "Escolha se o cadastro e de aluno ou de recrutador.");
  assert(email && email.includes("@"), "Informe um email valido.");
  assert(password.length >= 6, "A senha precisa ter pelo menos 6 caracteres.");
  assert(!db.users.some((user) => user.email === email), "Ja existe uma conta com esse email.");

  let newUser = null;

  if (role === "student") {
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const course = String(body.course || "").trim();
    const preferredArea = String(body.preferredArea || "frontend").trim().toLowerCase();

    assert(name.length >= 2, "Informe o nome do aluno.");
    assert(phone.length >= 8, "Informe um telefone valido.");
    assert(course.length >= 2, "Informe o curso.");

    const passwordRecord = createPasswordRecord(password);

    newUser = {
      id: randomId("student"),
      role: "student",
      name,
      email,
      phone,
      course,
      preferredArea: getAreaMeta(preferredArea).key,
      city: String(body.city || "").trim(),
      headline: `${course} em busca da primeira oportunidade.`,
      bio: "",
      skills: [],
      portfolioUrl: "",
      linkedinUrl: "",
      goal: "",
      availability: "",
      favorites: [],
      history: [],
      createdAt: nowIso(),
      ...passwordRecord
    };
  } else {
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const companyName = String(body.companyName || "").trim();
    const companyFocus = String(body.companyFocus || "").trim().toLowerCase();
    const companyModel = String(body.companyModel || "").trim();
    const companySize = String(body.companySize || "").trim();
    const companyNote = String(body.companyNote || "").trim();

    assert(name.length >= 2, "Informe o nome do responsavel.");
    assert(companyName.length >= 2, "Informe o nome da empresa.");

    const company = {
      id: randomId("company"),
      slug: slugify(companyName) || randomId("empresa"),
      name: companyName,
      sector: `${getAreaMeta(companyFocus).label} e oportunidades`,
      areas: [getAreaMeta(companyFocus).key],
      model: companyModel || "Hibrido",
      size: companySize || "Equipe em crescimento",
      location: String(body.location || "Brasil").trim(),
      website: normalizeUrl(body.website),
      linkedin: normalizeUrl(body.linkedin),
      image:
        normalizeUrl(body.image) ||
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      summary: companyNote || "Empresa em busca de estudantes com boa base e vontade de aprender.",
      story: companyNote || "Empresa em fase de organizacao de trilha para talentos em inicio de carreira.",
      culture: "Clareza no processo, onboarding mais leve e proximidade com o time no inicio.",
      proposal: "Boa entrada para quem quer aprender em contexto real e crescer com acompanhamento.",
      highlights: [
        "Onboarding com mais contexto.",
        "Espaco para estudantes em inicio de carreira.",
        "Fluxo de vaga com acompanhamento mais humano."
      ]
    };

    db.companies.push(company);

    const passwordRecord = createPasswordRecord(password);
    newUser = {
      id: randomId("recruiter"),
      role: "recruiter",
      name,
      email,
      phone,
      companyId: company.id,
      createdAt: nowIso(),
      ...passwordRecord
    };
  }

  db.users.push(newUser);
  const token = createSession(db, newUser.id);
  await saveDb(db);

  sendJson(response, 201, buildSessionPayload(db, newUser, token));
}

async function handleAuthLogin(request, response) {
  const db = await loadDb();
  const body = await readJsonBody(request);

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();

  const user = db.users.find((item) => item.email === email);
  assert(user, "Nao encontrei uma conta com esse email.", 404);
  assert(verifyPassword(user, password), "A senha nao confere.", 401);

  const token = createSession(db, user.id);
  await saveDb(db);

  sendJson(response, 200, buildSessionPayload(db, user, token));
}

async function handleAuthSession(request, response) {
  const db = await loadDb();
  const token = getAuthToken(request);
  const user = findUserByToken(db, token);

  if (!user) {
    sendJson(response, 200, {
      authenticated: false,
      user: null
    });
    return;
  }

  sendJson(response, 200, {
    authenticated: true,
    user: sanitizeUser(user, db)
  });
}

async function handleAuthLogout(request, response) {
  const db = await loadDb();
  const token = getAuthToken(request);
  removeSession(db, token);
  await saveDb(db);

  sendJson(response, 200, {
    ok: true
  });
}

async function handleConfig(response) {
  sendJson(response, 200, {
    areas: AREA_CATALOG,
    demoAccounts: [
      {
        role: "student",
        email: "larissa@conecta.dev",
        password: "123456"
      },
      {
        role: "recruiter",
        email: "rh@orbitlabs.com",
        password: "123456"
      }
    ]
  });
}

async function handleJobsList(request, response, url) {
  const db = await loadDb();
  const search = String(url.searchParams.get("search") || "").trim().toLowerCase();
  const area = String(url.searchParams.get("area") || "").trim().toLowerCase();
  const companyId = String(url.searchParams.get("companyId") || "").trim();

  const jobs = db.jobs
    .filter((job) => !companyId || job.companyId === companyId)
    .filter((job) => !area || area === "todos" || job.primaryArea === area || (job.areaKeys || []).includes(area))
    .filter((job) => {
      if (!search) return true;
      const company = db.companies.find((item) => item.id === job.companyId);
      const haystack = [
        job.title,
        job.summary,
        job.description,
        job.primaryArea,
        job.segment,
        job.location,
        ...(job.stack || []),
        ...(job.highlights || []),
        company ? company.name : "",
        company ? company.sector : ""
      ].join(" ").toLowerCase();

      return haystack.includes(search);
    })
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .map((job) => serializeJob(job, db, {}));

  sendJson(response, 200, {
    jobs,
    total: jobs.length,
    areas: AREA_CATALOG
  });
}

async function handleJobDetail(response, jobId) {
  const db = await loadDb();
  const job = db.jobs.find((item) => item.id === jobId || item.slug === jobId);
  assert(job, "Nao encontrei essa vaga.", 404);

  const company = db.companies.find((item) => item.id === job.companyId);
  const relatedJobs = db.jobs
    .filter((item) => item.id !== job.id)
    .filter((item) => item.primaryArea === job.primaryArea || item.companyId === job.companyId)
    .slice(0, 4)
    .map((item) => serializeJob(item, db, {}));

  sendJson(response, 200, {
    job: serializeJob(job, db, { full: true }),
    company: company ? serializeCompany(company, db, { includeStory: true }) : null,
    relatedJobs
  });
}

async function handleJobCreate(request, response) {
  const db = await loadDb();
  const user = requireUser(request, db);
  requireRole(user, "recruiter");
  const body = await readJsonBody(request);

  const title = String(body.title || "").trim();
  const primaryArea = String(body.primaryArea || "").trim().toLowerCase();
  const model = String(body.model || "").trim();
  const level = String(body.level || "").trim();
  const summary = String(body.summary || "").trim();
  const link = String(body.link || "").trim();

  assert(title.length >= 3, "Informe um titulo para a vaga.");
  assert(link.startsWith("http://") || link.startsWith("https://"), "Informe um link valido para a vaga.");

  const areaMeta = getAreaMeta(primaryArea || "frontend");
  const job = {
    id: randomId("job"),
    slug: slugify(title),
    companyId: user.companyId,
    recruiterId: user.id,
    title,
    primaryArea: areaMeta.key,
    areaKeys: Array.from(new Set([areaMeta.key, ...toSkillList(body.secondaryAreas)])),
    segment: areaMeta.segment,
    level: level || "Estagio",
    model: model || "Remoto",
    location: String(body.location || "Brasil").trim(),
    status: "open",
    createdAt: nowIso(),
    image:
      normalizeUrl(body.image) ||
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    summary: summary || "Vaga com contexto real, aprendizado e acompanhamento no inicio de carreira.",
    description: String(body.description || body.summary || "").trim() || "Detalhes da vaga ainda serao complementados pelo recrutador.",
    requirements: toSkillList(body.requirements).length ? toSkillList(body.requirements) : ["Interesse em aprender", "Base alinhada com a area", "Boa comunicacao no processo"],
    highlights: toSkillList(body.highlights).length ? toSkillList(body.highlights) : ["Onboarding guiado", "Contato com time e contexto real"],
    stack: toSkillList(body.stack).length ? toSkillList(body.stack) : ["Aprendizado", areaMeta.label],
    link
  };

  db.jobs.push(job);
  await saveDb(db);

  sendJson(response, 201, {
    job: serializeJob(job, db, { full: true })
  });
}

async function handleJobUpdate(request, response, jobId) {
  const db = await loadDb();
  const user = requireUser(request, db);
  requireRole(user, "recruiter");
  const job = db.jobs.find((item) => item.id === jobId);
  assert(job && job.companyId === user.companyId, "Nao encontrei essa vaga para atualizar.", 404);

  const body = await readJsonBody(request);
  const status = String(body.status || "").trim().toLowerCase();
  assert(["open", "pending", "filled"].includes(status), "Escolha um status valido para a vaga.");

  job.status = status;
  await saveDb(db);

  sendJson(response, 200, {
    job: serializeJob(job, db, { full: true })
  });
}

async function handleCompaniesList(response, url) {
  const db = await loadDb();
  const search = String(url.searchParams.get("search") || "").trim().toLowerCase();
  const area = String(url.searchParams.get("area") || "").trim().toLowerCase();

  const companies = db.companies
    .filter((company) => !area || area === "todos" || company.areas.includes(area))
    .filter((company) => {
      if (!search) return true;
      const haystack = [company.name, company.sector, company.summary, company.culture, ...(company.areas || [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    })
    .map((company) => serializeCompany(company, db, {}));

  sendJson(response, 200, {
    companies,
    total: companies.length
  });
}

async function handleCompanyDetail(response, companyId) {
  const db = await loadDb();
  const company = db.companies.find((item) => item.id === companyId || item.slug === companyId);
  assert(company, "Nao encontrei essa empresa.", 404);

  const jobs = db.jobs
    .filter((job) => job.companyId === company.id)
    .map((job) => serializeJob(job, db, {}));

  sendJson(response, 200, {
    company: serializeCompany(company, db, { includeStory: true }),
    jobs
  });
}

async function handleStudentsList(request, response, url) {
  const db = await loadDb();
  const user = requireUser(request, db);
  requireRole(user, "recruiter");

  const students = serializeStudentList(db, {
    search: url.searchParams.get("search") || "",
    area: url.searchParams.get("area") || ""
  });

  sendJson(response, 200, {
    students,
    total: students.length,
    areas: AREA_CATALOG
  });
}

async function handleStudentDetail(request, response, studentId) {
  const db = await loadDb();
  const user = requireUser(request, db);
  const student = db.users.find((item) => item.id === studentId && item.role === "student");
  assert(student, "Nao encontrei esse estudante.", 404);

  const canView = user.role === "recruiter" || user.id === student.id;
  assert(canView, "Esse perfil nao esta liberado para o seu acesso.", 403);

  sendJson(response, 200, {
    student: sanitizeStudent(student),
    favoriteJobs: getStudentFavorites(student, db),
    history: getStudentHistory(student, db)
  });
}

async function handleStudentDashboard(request, response) {
  const db = await loadDb();
  const user = requireUser(request, db);
  requireRole(user, "student");

  sendJson(response, 200, {
    student: sanitizeStudent(user),
    favorites: getStudentFavorites(user, db),
    history: getStudentHistory(user, db),
    recommendedJobs: getRecommendedJobs(user, db)
  });
}

async function handleStudentUpdate(request, response) {
  const db = await loadDb();
  const user = requireUser(request, db);
  requireRole(user, "student");
  const body = await readJsonBody(request);

  user.headline = String(body.headline || user.headline || "").trim();
  user.preferredArea = getAreaMeta(body.preferredArea || user.preferredArea).key;
  user.city = String(body.city || user.city || "").trim();
  user.bio = String(body.bio || user.bio || "").trim();
  user.goal = String(body.goal || user.goal || "").trim();
  user.availability = String(body.availability || user.availability || "").trim();
  user.portfolioUrl = normalizeUrl(body.portfolioUrl || user.portfolioUrl);
  user.linkedinUrl = normalizeUrl(body.linkedinUrl || user.linkedinUrl);
  user.skills = toSkillList(body.skills || user.skills);

  await saveDb(db);

  sendJson(response, 200, {
    student: sanitizeStudent(user)
  });
}

async function handleFavoritesList(request, response) {
  const db = await loadDb();
  const user = requireUser(request, db);
  requireRole(user, "student");

  sendJson(response, 200, {
    favorites: getStudentFavorites(user, db)
  });
}

async function handleFavoriteToggle(request, response, jobId) {
  const db = await loadDb();
  const user = requireUser(request, db);
  requireRole(user, "student");

  const job = db.jobs.find((item) => item.id === jobId);
  assert(job, "Nao encontrei essa vaga para favoritar.", 404);

  user.favorites = Array.isArray(user.favorites) ? user.favorites : [];
  const index = user.favorites.indexOf(jobId);
  let saved = false;

  if (index >= 0) {
    user.favorites.splice(index, 1);
  } else {
    user.favorites.unshift(jobId);
    saved = true;
  }

  await saveDb(db);

  sendJson(response, 200, {
    saved,
    favorites: getStudentFavorites(user, db)
  });
}

async function handleHistoryList(request, response) {
  const db = await loadDb();
  const user = requireUser(request, db);
  requireRole(user, "student");

  sendJson(response, 200, {
    history: getStudentHistory(user, db)
  });
}

async function handleHistoryRecord(request, response, jobId) {
  const db = await loadDb();
  const user = requireUser(request, db);
  requireRole(user, "student");

  const job = db.jobs.find((item) => item.id === jobId);
  assert(job, "Nao encontrei essa vaga.", 404);

  user.history = Array.isArray(user.history) ? user.history : [];
  user.history = user.history.filter((entry) => entry.jobId !== jobId);
  user.history.unshift({
    jobId,
    viewedAt: nowIso()
  });
  user.history = user.history.slice(0, 20);

  await saveDb(db);

  sendJson(response, 200, {
    ok: true,
    history: getStudentHistory(user, db)
  });
}

async function handleRecruiterDashboard(request, response) {
  const db = await loadDb();
  const user = requireUser(request, db);
  requireRole(user, "recruiter");

  sendJson(response, 200, computeRecruiterDashboard(user, db));
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

async function routeApi(request, response, url) {
  const pathname = url.pathname;

  if (request.method === "GET" && pathname === "/api/config") {
    await handleConfig(response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/auth/register") {
    await handleAuthRegister(request, response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    await handleAuthLogin(request, response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/auth/session") {
    await handleAuthSession(request, response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/auth/logout") {
    await handleAuthLogout(request, response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/jobs") {
    await handleJobsList(request, response, url);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/jobs") {
    await handleJobCreate(request, response);
    return true;
  }

  if (request.method === "PATCH" && pathname.startsWith("/api/jobs/")) {
    const jobId = pathname.split("/")[3];
    await handleJobUpdate(request, response, jobId);
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/api/jobs/")) {
    const jobId = pathname.split("/")[3];
    await handleJobDetail(response, jobId);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/companies") {
    await handleCompaniesList(response, url);
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/api/companies/")) {
    const companyId = pathname.split("/")[3];
    await handleCompanyDetail(response, companyId);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/students") {
    await handleStudentsList(request, response, url);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/student/dashboard") {
    await handleStudentDashboard(request, response);
    return true;
  }

  if (request.method === "PATCH" && pathname === "/api/students/me") {
    await handleStudentUpdate(request, response);
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/api/students/")) {
    const studentId = pathname.split("/")[3];
    await handleStudentDetail(request, response, studentId);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/users/me/favorites") {
    await handleFavoritesList(request, response);
    return true;
  }

  if (request.method === "POST" && pathname.startsWith("/api/favorites/")) {
    const jobId = pathname.split("/")[3];
    await handleFavoriteToggle(request, response, jobId);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/users/me/history") {
    await handleHistoryList(request, response);
    return true;
  }

  if (request.method === "POST" && pathname.startsWith("/api/history/")) {
    const jobId = pathname.split("/")[3];
    await handleHistoryRecord(request, response, jobId);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/recruiter/dashboard") {
    await handleRecruiterDashboard(request, response);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/conecta-ia/status") {
    sendJson(response, 200, {
      ready: Boolean(process.env.OPENAI_API_KEY),
      model: DEFAULT_MODEL,
      message: process.env.OPENAI_API_KEY
        ? `Servidor local pronto para usar a OpenAI em ${DEFAULT_MODEL}.`
        : "Servidor local ativo, mas sem OPENAI_API_KEY. O site continua em modo demo."
    });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/conecta-ia") {
    const payload = await readJsonBody(request);

    if (!payload.message || !String(payload.message).trim()) {
      sendJson(response, 400, {
        message: "Escreva uma pergunta antes de chamar a assistente."
      });
      return true;
    }

    const openAiResult = await getOpenAIResponse(payload);
    sendJson(response, openAiResult.status, openAiResult.payload);
    return true;
  }

  return false;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      Allow: "GET, POST, PATCH, OPTIONS"
    });
    response.end();
    return;
  }

  try {
    const handled = await routeApi(request, response, url);
    if (handled) return;

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
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof HttpError ? error.message : "Nao consegui concluir essa operacao agora.";
    sendJson(response, statusCode, {
      message
    });
  }
});

loadDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Conecta Estagio rodando em http://localhost:${PORT}`);
      console.log("Autenticacao, banco JSON e paginas dinamicas prontos para os fluxos locais.");
      console.log("Se quiser a Conecta IA em modo real, defina OPENAI_API_KEY antes de iniciar.");
    });
  })
  .catch((error) => {
    console.error("Nao consegui iniciar o banco local da aplicacao.", error);
    process.exit(1);
  });
