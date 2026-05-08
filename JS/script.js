const progressBar = document.getElementById("scroll-progress");
const menuToggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");
const prefersReducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function prefersReducedMotion() {
  return prefersReducedMotionQuery.matches;
}

function updateScrollProgress() {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  document.body.classList.toggle("is-scrolled", scrollTop > 18);

  if (!progressBar) return;

  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  progressBar.style.width = `${progress}%`;
}

function setupRevealDirections() {
  const leftSelectors = [
    ".hero-copy",
    ".section-heading",
    ".portal-topbar",
    ".auth-copy",
    ".hero-media-copy",
    ".assistant-shell"
  ];
  const rightSelectors = [
    ".hero-media-card",
    ".auth-visual",
    ".spotlight-card",
    ".preview-post",
    ".recruiter-donut-card"
  ];
  const staggerGroups = [
    ".hero-proof",
    ".feature-grid",
    ".journey-grid",
    ".metric-grid",
    ".lane-grid",
    ".job-list-grid",
    ".photo-grid",
    ".hero-note-grid",
    ".community-grid",
    ".insight-grid",
    ".dual-grid",
    ".spotlight-grid",
    ".company-showcase-grid",
    ".culture-grid",
    ".composer-row",
    ".visual-grid",
    ".media-line",
    ".recruiter-chart-overview",
    ".recruiter-chart-notes"
  ];

  document.querySelectorAll(leftSelectors.join(", ")).forEach((element) => {
    if (!element.classList.contains("reveal")) return;
    if (!element.dataset.reveal) {
      element.dataset.reveal = "left";
    }
  });

  document.querySelectorAll(rightSelectors.join(", ")).forEach((element) => {
    if (!element.classList.contains("reveal")) return;
    if (!element.dataset.reveal) {
      element.dataset.reveal = "right";
    }
  });

  staggerGroups.forEach((selector) => {
    document.querySelectorAll(selector).forEach((group) => {
      const items = Array.from(group.children).filter((child) => child.classList.contains("reveal"));
      items.forEach((item, index) => {
        if (!item.style.getPropertyValue("--reveal-delay")) {
          item.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 36}ms`);
        }

        if (!item.dataset.reveal) {
          item.dataset.reveal = "soft";
        }
      });
    });
  });
}

function setupReveal() {
  setupRevealDirections();
  const revealElements = document.querySelectorAll(".reveal");

  const activateReveal = (element, extraDelay = 0) => {
    if (!element || element.classList.contains("active")) return;

    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        element.classList.add("active");
      });
    }, extraDelay);
  };

  if (!("IntersectionObserver" in window)) {
    revealElements.forEach((element, index) => activateReveal(element, 32 + Math.min(index, 5) * 24));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const initialDelay = entry.boundingClientRect.top < window.innerHeight ? 36 : 10;
        activateReveal(entry.target, initialDelay);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  revealElements.forEach((element) => observer.observe(element));
}

function setupParallax() {
  if (prefersReducedMotion()) return;

  const parallaxTargets = document.querySelectorAll(
    ".hero-media-card, .auth-visual, .spotlight-card, .preview-post, .photo-card, .sidebar-summary, .recruiter-donut-card, .hero-note-card"
  );

  if (!parallaxTargets.length) return;

  let isScheduled = false;

  const applyParallax = () => {
    isScheduled = false;
    const viewportHeight = window.innerHeight || 1;

    parallaxTargets.forEach((element) => {
      element.classList.add("parallax-soft");
      const rect = element.getBoundingClientRect();

      if (rect.bottom < -40 || rect.top > viewportHeight + 40) return;

      const centerOffset = rect.top + rect.height / 2 - viewportHeight / 2;
      const shift = Math.max(-6, Math.min(6, centerOffset * -0.016));
      element.style.setProperty("--parallax-shift", `${shift.toFixed(2)}px`);
    });
  };

  const requestParallaxFrame = () => {
    if (isScheduled) return;
    isScheduled = true;
    window.requestAnimationFrame(applyParallax);
  };

  window.addEventListener("scroll", requestParallaxFrame, { passive: true });
  window.addEventListener("resize", requestParallaxFrame);
  requestParallaxFrame();
}

function setupPageTransitions() {
  const { body } = document;
  if (!body) return;

  body.classList.add("page-enter");
  void body.offsetHeight;

  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      body.classList.add("page-ready");
    });
  }, 20);

  if (prefersReducedMotion()) return;

  const links = document.querySelectorAll("a[href]");

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.href === window.location.href) return;

      event.preventDefault();
      body.classList.add("page-leaving");

      window.setTimeout(() => {
        window.location.href = destination.href;
      }, 160);
    });
  });

  window.addEventListener("pageshow", () => {
    body.classList.remove("page-leaving");
    body.classList.add("page-ready");
  });
}

function setupMenu() {
  if (!menuToggle || !navMenu) return;

  menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navMenu.classList.remove("active"));
  });
}

function setupCurrentLinks() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const normalizedPath = currentPath === "" ? "index.html" : currentPath;
  const links = document.querySelectorAll(".nav-menu a, .footer-links a");

  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.includes("://")) return;
    if (link.classList.contains("button")) return;

    const cleanHref = href.split("#")[0];
    const isCurrent = cleanHref === normalizedPath;
    link.classList.toggle("is-current", isCurrent);
    if (isCurrent && link.closest(".nav-menu")) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function setupAuthTabs() {
  const tabButtons = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-panel]");

  if (!tabButtons.length || !panels.length) return;

  function activateTab(target) {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.authTab === target;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.authPanel === target;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.authTab));
  });
}

function showToast(message) {
  if (!message) return;

  let toast = document.querySelector(".toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2800);
}

function setupDemoForms() {
  const forms = document.querySelectorAll(".js-demo-submit");

  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = form.dataset.successMessage || "Tudo certo por aqui.";
      showToast(message);
    });
  });
}

function setupCommunityFilters() {
  const filterButtons = document.querySelectorAll("[data-community-filter]");

  if (!filterButtons.length) return;

  const posts = document.querySelectorAll("#community-feed [data-topic]");

  function applyFilter(filterValue) {
    posts.forEach((post) => {
      const shouldShow = filterValue === "todos" || post.dataset.topic === filterValue;
      post.classList.toggle("is-hidden", !shouldShow);
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      applyFilter(button.dataset.communityFilter);
    });
  });
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createCommunityPost(message, topic, source, role) {
  const topicLabel = topic === "processos"
    ? "Processos"
    : topic === "cursos"
      ? "Cursos"
      : topic === "rotina"
        ? "Rotina"
        : "Portfólio";
  const isRecruiter = role === "recruiter";
  const roleLabel = isRecruiter ? "Recrutador" : "Aluno";
  const roleTag = isRecruiter ? '<span class="role-tag recruiter-tag">Recrutador</span>' : "";
  const sourceLabel = escapeHtml(source);

  const article = document.createElement("article");
  article.className = `surface-card feed-card reveal active${isRecruiter ? " recruiter-post" : ""}`;
  article.dataset.topic = topic;
  article.dataset.role = role;
  article.innerHTML = `
    <div class="post-header">
      <div class="avatar-badge">${isRecruiter ? "RH" : "VC"}</div>
      <div class="post-meta">
        <div class="post-meta-line">
          <strong>Você</strong>
          ${roleTag}
        </div>
        <span>${sourceLabel} | ${topicLabel} | ${roleLabel}</span>
      </div>
    </div>

    <p class="feed-copy">${escapeHtml(message)}</p>

    <div class="post-tags">
      <span class="pill">${topicLabel}</span>
      <span class="pill pill-soft">${sourceLabel}</span>
    </div>

    <div class="meta-row">
      <button type="button" class="meta-button like-button" data-base-count="0">0 curtidas</button>
      <button type="button" class="meta-button">0 comentários</button>
    </div>
  `;

  return article;
}

function setupCommunityComposer() {
  const form = document.getElementById("community-form");
  const feed = document.getElementById("community-feed");

  if (!form || !feed) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const messageField = document.getElementById("post-message");
    const topicField = document.getElementById("post-topic");
    const roleField = document.getElementById("post-role");
    const courseField = document.getElementById("post-course");

    if (!messageField || !topicField || !roleField || !courseField) return;

    const message = messageField.value.trim();
    const topic = topicField.value;
    const role = roleField.value;
    const course = courseField.value.trim();

    if (!message || !topic || !role || !course) {
      showToast("Preencha o relato, o tema, o perfil e o curso ou a empresa antes de publicar.");
      return;
    }

    const newPost = createCommunityPost(message, topic, course, role);
    feed.prepend(newPost);
    form.reset();
    showToast("Relato publicado na comunidade.");

    const activeFilter = document.querySelector("[data-community-filter].active");
    const selectedFilter = activeFilter ? activeFilter.dataset.communityFilter : "todos";

    if (selectedFilter !== "todos" && selectedFilter !== topic) {
      newPost.classList.add("is-hidden");
    }
  });
}

function setupLikes() {
  document.addEventListener("click", (event) => {
    const likeButton = event.target.closest(".like-button");
    if (!likeButton) return;

    const baseCount = Number(likeButton.dataset.baseCount || 0);
    const isActive = likeButton.classList.toggle("active");
    const nextCount = isActive ? baseCount + 1 : baseCount;

    likeButton.textContent = `${nextCount} curtidas`;
  });
}

function setupJobsFilters() {
  const filterButtons = document.querySelectorAll("[data-job-filter]");
  const jobCards = document.querySelectorAll("[data-job-area]");
  const jobsCount = document.getElementById("jobs-count");
  const emptyState = document.getElementById("jobs-empty-state");

  if (!filterButtons.length || !jobCards.length) return;

  function formatCount(value) {
    return `${value} vaga${value === 1 ? "" : "s"} encontrada${value === 1 ? "" : "s"}`;
  }

  function applyJobFilter(filterValue) {
    let visibleCount = 0;

    jobCards.forEach((card) => {
      const shouldShow = filterValue === "todos" || card.dataset.jobArea === filterValue;
      card.classList.toggle("is-hidden", !shouldShow);
      if (shouldShow) visibleCount += 1;
    });

    if (jobsCount) jobsCount.textContent = formatCount(visibleCount);
    if (emptyState) emptyState.classList.toggle("active", visibleCount === 0);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      applyJobFilter(button.dataset.jobFilter);
    });
  });

  applyJobFilter("todos");
}

function setupCareerAssistant() {
  const pageKey = window.location.pathname.split("/").pop() || "index.html";
  const assistantProfiles = {
    "index.html": {
      subtitle: "Explico a ideia da plataforma, dou direção de carreira e ajudo a pensar nos próximos passos.",
      intro: "Oi, eu sou a Conecta IA. Posso te ajudar com área tech, portfólio, entrevistas ou até com a visão futura da plataforma.",
      prompts: [
        "Qual área tech combina comigo?",
        "Como melhorar meu portfólio?",
        "Que outras áreas podem entrar no futuro?"
      ]
    },
    "vagas.html": {
      subtitle: "Ajudo a interpretar vagas, escolher área e aplicar com mais critério.",
      intro: "Posso te ajudar a entender uma vaga, escolher uma trilha ou pensar no que faz sentido aplicar agora.",
      prompts: [
        "Como saber se uma vaga combina comigo?",
        "Front-end ou back-end: por onde começo?",
        "O que olhar antes de aplicar?"
      ]
    },
    "cadastro.html": {
      subtitle: "Oriento o que preencher e como deixar seu cadastro mais claro.",
      intro: "Se quiser, eu te ajudo a decidir o que colocar no cadastro e como apresentar melhor seu momento.",
      prompts: [
        "O que vale colocar no cadastro de aluno?",
        "Como uma empresa deve se apresentar?",
        "Como deixar o cadastro mais objetivo?"
      ]
    },
    "dashboard-recrutador.html": {
      subtitle: "Dou apoio para escrever vaga, avaliar perfil e melhorar a comunicação com estudantes.",
      intro: "Posso te ajudar a escrever uma vaga melhor, analisar perfis ou pensar em dicas mais honestas para quem está entrando no mercado.",
      prompts: [
        "Como escrever uma vaga melhor?",
        "O que avaliar no perfil de um estudante?",
        "Como orientar melhor na comunidade?"
      ]
    },
    "dashboard.html": {
      subtitle: "Ajudo a ler perfis e identificar pontos fortes de entrada.",
      intro: "Se quiser, eu posso te ajudar a interpretar melhor os perfis e pensar no que chama mais atenção no início de carreira.",
      prompts: [
        "O que mais pesa num perfil iniciante?",
        "Como identificar clareza de portfólio?",
        "Quais sinais indicam boa comunicação?"
      ]
    },
    "comunidade.html": {
      subtitle: "Ajudo com ideias de post, respostas e trocas mais naturais na comunidade.",
      intro: "Posso sugerir temas de conversa, ajudar a escrever um relato ou pensar em respostas mais acolhedoras para a comunidade.",
      prompts: [
        "Que tipo de post gera conversa boa?",
        "Como pedir feedback de portfólio?",
        "Que dica um recrutador pode dar aqui?"
      ]
    },
    "empresas.html": {
      subtitle: "Ajudo a apresentar a empresa de um jeito mais humano e mais convincente.",
      intro: "Se quiser, eu posso te ajudar a pensar em como uma empresa pode se apresentar melhor para quem está começando.",
      prompts: [
        "Como apresentar melhor uma empresa?",
        "O que estudante quer saber antes de aplicar?",
        "Como deixar a proposta menos genérica?"
      ]
    }
  };

  const profile = assistantProfiles[pageKey] || assistantProfiles["index.html"];
  const storageKeys = {
    previousResponseId: `conecta-assistant-response-${pageKey}`
  };
  const assistantState = {
    mode: "demo",
    model: "gpt-5.4-mini",
    previousResponseId: readStorage(window.sessionStorage, storageKeys.previousResponseId),
    isWaiting: false,
    statusNote: "Sem servidor local, a assistente segue em modo demo."
  };

  function readStorage(storage, key) {
    try {
      return storage.getItem(key) || "";
    } catch (error) {
      return "";
    }
  }

  function writeStorage(storage, key, value) {
    try {
      if (!value) {
        storage.removeItem(key);
        return;
      }

      storage.setItem(key, value);
    } catch (error) {
      return;
    }
  }

  function renderAvatarMarkup(extraClass = "") {
    return `
      <span class="assistant-avatar${extraClass ? ` ${extraClass}` : ""}" aria-hidden="true">
        <span class="assistant-avatar-core">
          <span class="assistant-avatar-antenna"></span>
          <span class="assistant-avatar-face">
            <span class="assistant-avatar-eye"></span>
            <span class="assistant-avatar-eye"></span>
            <span class="assistant-avatar-mouth"></span>
          </span>
        </span>
        <span class="assistant-avatar-pulse"></span>
      </span>
    `;
  }

  const shell = document.createElement("section");
  shell.className = "assistant-shell";
  shell.innerHTML = `
    <button type="button" class="assistant-toggle" id="assistant-toggle" aria-expanded="false">
      ${renderAvatarMarkup()}
      <span class="assistant-toggle-copy">
        <strong>Conecta IA</strong>
        <span>Dicas rápidas para o site</span>
      </span>
    </button>

    <div class="assistant-panel" id="assistant-panel" hidden>
      <div class="assistant-header">
        <div class="assistant-header-main">
          <div class="assistant-header-identity">
            ${renderAvatarMarkup("assistant-avatar-large")}
            <div>
              <p class="mini-label">Conecta IA</p>
              <h2>Assistente de carreira</h2>
              <p>${profile.subtitle}</p>
            </div>
          </div>
        </div>
        <button type="button" class="assistant-close" id="assistant-close" aria-label="Fechar assistente">Fechar</button>
      </div>

      <div class="assistant-connection">
        <div class="assistant-connection-copy">
          <p class="mini-label">Modo da assistente</p>
          <strong id="assistant-mode-label">Modo demo ativo</strong>
          <span id="assistant-mode-description">Ela continua ajudando mesmo sem servidor.</span>
        </div>
        <button type="button" class="button button-secondary assistant-settings-toggle" id="assistant-settings-toggle">Como ativar</button>
      </div>

      <div class="assistant-settings" id="assistant-settings" hidden>
        <div class="assistant-settings-grid">
          <article class="assistant-status-card">
            <div class="assistant-status-row">
              <span class="assistant-status-dot" id="assistant-status-dot"></span>
              <strong id="assistant-connection-status">Servidor offline</strong>
            </div>
            <p class="assistant-note" id="assistant-connection-note">
              Para usar a IA real, rode o servidor local com a chave da OpenAI no ambiente.
            </p>
          </article>

          <article class="assistant-status-card">
            <p class="mini-label">Como ativar a IA real</p>
            <strong>Use o servidor local do projeto</strong>
            <p class="assistant-note">
              A documentação da OpenAI pede para não expor chave no navegador. Por isso, o modo real passa por um servidor local.
            </p>
          </article>
        </div>

        <div class="assistant-command-card">
          <p class="mini-label">Comando sugerido</p>
          <code id="assistant-command">$env:OPENAI_API_KEY="sua-chave"; node server.js</code>
        </div>

        <div class="assistant-settings-actions">
          <button type="button" class="button button-secondary" id="assistant-refresh-status">Atualizar status</button>
          <button type="button" class="button button-secondary" id="assistant-reset-chat">Nova conversa</button>
        </div>
      </div>

      <div class="assistant-feed" id="assistant-feed"></div>

      <div class="assistant-suggestions" id="assistant-suggestions">
        ${profile.prompts.map((prompt) => `<button type="button" class="assistant-chip">${prompt}</button>`).join("")}
      </div>

      <form class="assistant-form" id="assistant-form">
        <label class="assistant-label" for="assistant-input">Pergunte algo sobre carreira, vaga, perfil ou comunidade</label>
        <textarea
          id="assistant-input"
          rows="3"
          placeholder="Ex.: Como posso deixar meu portfólio mais forte para vaga front-end?"
          required
        ></textarea>
        <div class="assistant-form-actions">
          <button type="submit" class="button button-primary">Pedir dica</button>
        </div>
        <p class="assistant-form-status" id="assistant-form-status">Modo demo ativo. Se quiser ligar a IA real, rode o servidor local.</p>
      </form>

      <p class="assistant-footer-note" id="assistant-footer-note">
        Sem servidor local, a Conecta IA continua te ajudando com base no contexto do próprio projeto.
      </p>
    </div>
  `;

  document.body.appendChild(shell);

  const toggle = document.getElementById("assistant-toggle");
  const panel = document.getElementById("assistant-panel");
  const closeButton = document.getElementById("assistant-close");
  const form = document.getElementById("assistant-form");
  const input = document.getElementById("assistant-input");
  const feed = document.getElementById("assistant-feed");
  const suggestionButtons = shell.querySelectorAll(".assistant-chip");
  const settingsToggle = document.getElementById("assistant-settings-toggle");
  const settingsPanel = document.getElementById("assistant-settings");
  const modeLabel = document.getElementById("assistant-mode-label");
  const modeDescription = document.getElementById("assistant-mode-description");
  const statusDot = document.getElementById("assistant-status-dot");
  const connectionStatus = document.getElementById("assistant-connection-status");
  const connectionNote = document.getElementById("assistant-connection-note");
  const commandLine = document.getElementById("assistant-command");
  const refreshStatusButton = document.getElementById("assistant-refresh-status");
  const resetChatButton = document.getElementById("assistant-reset-chat");
  const formStatus = document.getElementById("assistant-form-status");
  const footerNote = document.getElementById("assistant-footer-note");
  const submitButton = form ? form.querySelector('button[type="submit"]') : null;

  if (!toggle || !panel || !closeButton || !form || !input || !feed) return;

  function formatAssistantText(text) {
    return escapeHtml(String(text || "")).replaceAll("\n", "<br>");
  }

  function appendAssistantMessage(role, text) {
    const message = document.createElement("article");
    message.className = `assistant-message ${role === "user" ? "assistant-message-user" : "assistant-message-bot"}`;
    message.innerHTML = `
      <span class="assistant-badge">${role === "user" ? "Você" : "IA"}</span>
      <p>${formatAssistantText(text)}</p>
    `;
    feed.appendChild(message);
    feed.scrollTop = feed.scrollHeight;
  }

  function getAssistantResponse(message) {
    const text = message.toLowerCase();

    if (text.includes("portfolio") || text.includes("github") || text.includes("projeto")) {
      return "Para portfólio de início de carreira, tente mostrar menos volume e mais clareza: 2 ou 3 projetos, contexto curto, tecnologias usadas, o que você resolveu e o que aprendeu no processo. Se der, deixe o GitHub organizado e com um README simples.";
    }

    if (text.includes("entrevista") || text.includes("processo") || text.includes("dinamica")) {
      return "Em processo seletivo, vale mais mostrar raciocínio e postura do que tentar parecer pronto. Uma boa estratégia é explicar como você pensou, onde teve dúvida e o que faria para evoluir a partir dali.";
    }

    if (text.includes("curriculo") || text.includes("linkedin")) {
      return "Para currículo e LinkedIn, o ideal é deixar o foco claro logo no início: curso, área que você procura, tecnologias que estuda e projetos que mais te representam. Evite encher de texto e tente facilitar a leitura em poucos segundos.";
    }

    if (text.includes("front") || text.includes("frontend")) {
      return "Se você curte interface, responsividade e experiência visual, front-end costuma fazer mais sentido. Tente fortalecer HTML, CSS, JavaScript, componentes e um portfólio que mostre cuidado visual e organização.";
    }

    if (text.includes("back") || text.includes("backend")) {
      return "Se você gosta mais de lógica, API, banco e do que acontece por trás da interface, back-end pode ser um caminho melhor. O ideal é mostrar base de lógica, estrutura de dados, banco e pequenos projetos com regra de negócio.";
    }

    if (text.includes("dados")) {
      return "Para dados, o mais forte no início costuma ser mostrar organização, curiosidade analítica e alguma base de SQL, planilha, dashboard ou leitura de indicadores. Mesmo um projeto simples já ajuda a contar essa história.";
    }

    if (text.includes("suporte")) {
      return "Suporte é uma porta de entrada muito válida para tecnologia. O que costuma pesar bem é comunicação, organização, paciência com processo e vontade de entender sistema e operação no dia a dia.";
    }

    if (text.includes("vaga") || text.includes("descricao") || text.includes("recrutador")) {
      return pageKey === "dashboard-recrutador.html"
        ? "Para vaga de início de carreira, o melhor é escrever de forma direta: contexto do time, o que a pessoa vai fazer, o que precisa saber de verdade, o que pode aprender e por onde ela aplica. Quanto menos genérica a vaga, melhor a aderência."
        : "Quando for ler uma vaga, tente olhar quatro coisas: área principal, tecnologias que aparecem, modelo de trabalho e se o texto parece real ou muito genérico. Isso já ajuda a filtrar melhor onde faz sentido aplicar.";
    }

    if (text.includes("empresa") || text.includes("cultura") || text.includes("apresent")) {
      return "Uma empresa fica mais interessante quando se apresenta de forma concreta: o que faz, como o time funciona, como recebe quem está entrando e que tipo de crescimento aquela oportunidade pode oferecer.";
    }

    if (text.includes("comunidade") || text.includes("post") || text.includes("feedback")) {
      return "Na comunidade, os melhores posts costumam ser os mais específicos. Em vez de perguntar algo muito amplo, vale contar o contexto, o que você tentou, onde travou e o tipo de retorno que gostaria de receber.";
    }

    if (text.includes("enfermagem") || text.includes("administra") || text.includes("logistica") || text.includes("pedagogia")) {
      return "Sim, a ideia da plataforma pode crescer para outras áreas. O mais importante seria adaptar a linguagem, os filtros e os tipos de vaga para a realidade de cada curso, sem perder essa ponte mais humana entre estudante e mercado.";
    }

    if (pageKey === "vagas.html") {
      return "Se você estiver em dúvida, comece filtrando por uma área que combine com o que você mais gosta de estudar agora. É melhor aplicar em menos vagas, com mais critério, do que sair atirando para todo lado.";
    }

    if (pageKey === "cadastro.html") {
      return "No cadastro, o ideal é deixar tudo direto e fácil de entender. Para aluno, vale foco no essencial. Para recrutador, vale clareza na empresa, na área e na forma como a vaga vai ser apresentada.";
    }

    if (pageKey === "dashboard-recrutador.html") {
      return "Na área do recrutador, o que mais ajuda é escrever vaga com contexto real e olhar perfil iniciante com lente de potencial, não de prontidão total. Clareza e acolhimento melhoram muito a qualidade das aplicações.";
    }

    if (pageKey === "comunidade.html") {
      return "Aqui, a melhor dica é puxar conversas que pareçam de gente de verdade. Medo de entrevista, dúvida de portfólio, rotina puxada e pequenas vitórias costumam gerar troca boa.";
    }

    return "Posso te ajudar com portfólio, vaga, entrevista, área tech, comunidade ou apresentação de empresa. Se quiser, me pergunte de um jeito simples que eu tento te orientar.";
  }

  function extractLiveReply(payload) {
    const parts = [];
    const outputItems = Array.isArray(payload.output) ? payload.output : [];

    outputItems.forEach((item) => {
      if (item.type !== "message" || !Array.isArray(item.content)) return;

      item.content.forEach((contentItem) => {
        if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
          parts.push(contentItem.text.trim());
        }
      });
    });

    return parts.filter(Boolean).join("\n\n").trim();
  }

  async function syncAssistantMode() {
    const fallbackNote = "Servidor local não encontrado. A assistente segue em modo demo por aqui.";

    try {
      const response = await fetch("/api/conecta-ia/status", {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        assistantState.mode = "demo";
        assistantState.statusNote = fallbackNote;
        updateConnectionUI();
        return;
      }

      const data = await response.json();
      assistantState.mode = data.ready ? "live" : "demo";
      assistantState.model = data.model || assistantState.model;
      assistantState.statusNote = data.message || fallbackNote;
      updateConnectionUI();
    } catch (error) {
      assistantState.mode = "demo";
      assistantState.statusNote = fallbackNote;
      updateConnectionUI();
    }
  }

  async function requestLiveAssistantResponse(message) {
    const response = await fetch("/api/conecta-ia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        message,
        pageKey,
        pageTitle: document.title,
        pageContext: profile.subtitle,
        previousResponseId: assistantState.previousResponseId || ""
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = typeof data.message === "string"
        ? data.message
        : "Não consegui falar com a IA real agora.";
      throw new Error(errorMessage);
    }

    const reply = extractLiveReply(data);

    if (!reply) {
      throw new Error("A IA real respondeu sem texto aproveitavel.");
    }

    assistantState.previousResponseId = data.responseId || "";
    writeStorage(window.sessionStorage, storageKeys.previousResponseId, assistantState.previousResponseId);
    assistantState.model = data.model || assistantState.model;
    assistantState.mode = "live";
    assistantState.statusNote = data.message || `Servidor pronto em ${assistantState.model}.`;

    return reply;
  }

  function updateConnectionUI(temporaryNote = "") {
    const isLive = assistantState.mode === "live";
    const statusText = temporaryNote || assistantState.statusNote;

    if (modeLabel) {
      modeLabel.textContent = isLive ? "IA real ligada" : "Modo demo ativo";
    }

    if (modeDescription) {
      modeDescription.textContent = isLive
        ? `A assistente está conversando com a OpenAI pelo servidor local usando ${assistantState.model}.`
        : "Ela continua ajudando com respostas locais, sem depender de servidor.";
    }

    if (connectionStatus) {
      connectionStatus.textContent = isLive ? "Servidor conectado" : "Servidor offline";
    }

    if (connectionNote) {
      connectionNote.textContent = statusText || "Use o servidor local para liberar a IA real.";
    }

    if (statusDot) {
      statusDot.classList.toggle("is-live", isLive);
      statusDot.classList.toggle("is-error", !isLive);
    }

    if (settingsToggle) {
      settingsToggle.textContent = isLive ? "Ver detalhes" : "Como ativar";
    }

    if (formStatus) {
      formStatus.textContent = assistantState.isWaiting
        ? isLive
          ? "Conecta IA está pensando com o modo real..."
          : "Conecta IA está montando uma dica por aqui..."
        : isLive
          ? `IA real pronta em ${assistantState.model}.`
          : "Modo demo ativo. Se quiser ligar a IA real, rode o servidor local.";
    }

    if (footerNote) {
      footerNote.textContent = isLive
        ? "Agora a assistente usa a API da OpenAI pelo servidor local do projeto."
        : "Sem servidor local, a Conecta IA continua te ajudando com base no contexto do próprio projeto.";
    }

    if (commandLine) {
      commandLine.textContent = '$env:OPENAI_API_KEY="sua-chave"; node server.js';
    }
  }

  function setAssistantBusy(isBusy) {
    assistantState.isWaiting = isBusy;

    if (input) input.disabled = isBusy;
    if (submitButton) submitButton.disabled = isBusy;
    if (submitButton) submitButton.textContent = isBusy ? "Pensando..." : "Pedir dica";

    updateConnectionUI();
  }

  function resetAssistantConversation() {
    assistantState.previousResponseId = "";
    writeStorage(window.sessionStorage, storageKeys.previousResponseId, "");
    feed.innerHTML = "";
    appendAssistantMessage("assistant", profile.intro);
    showToast("Conversa reiniciada.");
  }

  function toggleSettings(forceState) {
    if (!settingsPanel) return;

    const shouldShow = typeof forceState === "boolean" ? forceState : settingsPanel.hidden;
    settingsPanel.hidden = !shouldShow;
  }

  function openAssistant() {
    panel.hidden = false;
    shell.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeAssistant() {
    panel.hidden = true;
    shell.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  async function handleAssistantPrompt(prompt) {
    if (!prompt || assistantState.isWaiting) return;

    openAssistant();
    appendAssistantMessage("user", prompt);
    setAssistantBusy(true);

    try {
      const reply = assistantState.mode === "live"
        ? await requestLiveAssistantResponse(prompt)
        : getAssistantResponse(prompt);
      appendAssistantMessage("assistant", reply);
    } catch (error) {
      assistantState.mode = "demo";
      assistantState.statusNote = error.message || "Não consegui falar com a IA real agora.";
      updateConnectionUI(assistantState.statusNote);
      showToast("A IA real não respondeu agora. Segui em modo demo.");
      appendAssistantMessage(
        "assistant",
        `Não consegui usar a IA real agora, então segui no modo local.\n\n${getAssistantResponse(prompt)}`
      );
    } finally {
      setAssistantBusy(false);
    }
  }

  toggle.addEventListener("click", () => {
    if (panel.hidden) {
      openAssistant();
      return;
    }
    closeAssistant();
  });

  closeButton.addEventListener("click", closeAssistant);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;

    input.value = "";
    await handleAssistantPrompt(value);
  });

  suggestionButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const prompt = button.textContent.trim();
      await handleAssistantPrompt(prompt);
    });
  });

  if (settingsToggle) {
    settingsToggle.addEventListener("click", () => toggleSettings());
  }

  if (refreshStatusButton) {
    refreshStatusButton.addEventListener("click", async () => {
      updateConnectionUI("Atualizando o status do servidor local...");
      await syncAssistantMode();
      showToast(assistantState.mode === "live" ? "IA real pronta por aqui." : "Servidor não encontrado. Mantive o modo demo.");
    });
  }

  if (resetChatButton) {
    resetChatButton.addEventListener("click", resetAssistantConversation);
  }

  appendAssistantMessage("assistant", profile.intro);
  updateConnectionUI();
  syncAssistantMode();
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("load", updateScrollProgress);

setupPageTransitions();
setupReveal();
setupParallax();
setupMenu();
setupCurrentLinks();
setupAuthTabs();
setupDemoForms();
setupCommunityFilters();
setupCommunityComposer();
setupLikes();
setupJobsFilters();
setupCareerAssistant();
