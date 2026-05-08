const conectaPlatform = (() => {
  const TOKEN_KEY = "conecta-estagio-token";
  const FLASH_KEY = "conecta-estagio-flash";
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const state = {
    token: readStorage(window.localStorage, TOKEN_KEY),
    user: null,
    areas: [],
    favoriteIds: new Set()
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

  function notify(message) {
    if (!message) return;

    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }

    console.info(message);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function projectUrl(path) {
    const cleanPath = String(path || "").replace(/^\/+/, "");
    return `/Projeto/${cleanPath}`;
  }

  function currentProjectPath() {
    const fileName = currentPage || "index.html";
    return `${fileName}${window.location.search || ""}`;
  }

  function setFlashMessage(message) {
    writeStorage(window.sessionStorage, FLASH_KEY, message);
  }

  function consumeFlashMessage() {
    const message = readStorage(window.sessionStorage, FLASH_KEY);
    writeStorage(window.sessionStorage, FLASH_KEY, "");
    return message;
  }

  function storeToken(token) {
    state.token = token || "";
    writeStorage(window.localStorage, TOKEN_KEY, state.token);
  }

  function resetSession() {
    state.user = null;
    state.favoriteIds = new Set();
    storeToken("");
    syncAuthUi();
  }

  function updateFavoriteIds(favorites) {
    const ids = Array.isArray(favorites)
      ? favorites.map((item) => (typeof item === "string" ? item : item && item.id)).filter(Boolean)
      : [];
    state.favoriteIds = new Set(ids);

    if (state.user && state.user.role === "student") {
      state.user.favorites = ids;
    }
  }

  function saveSession(payload) {
    if (!payload) return;
    if (payload.token) storeToken(payload.token);
    if (payload.user) state.user = payload.user;

    if (state.user && state.user.role === "student") {
      updateFavoriteIds(state.user.favorites || []);
    } else {
      state.favoriteIds = new Set();
    }

    syncAuthUi();
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (state.token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${state.token}`);
    }

    const response = await fetch(path, {
      method: options.method || "GET",
      headers,
      body:
        options.body && headers.get("Content-Type") === "application/json"
          ? JSON.stringify(options.body)
          : options.body || undefined
    });

    const raw = await response.text();
    let data = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 401) {
        resetSession();
      }

      const message = typeof data.message === "string"
        ? data.message
        : "Não consegui concluir essa operação agora.";
      throw new Error(message);
    }

    return data;
  }

  function getAreaMeta(areaKey) {
    return state.areas.find((area) => area.key === areaKey) || {
      key: areaKey,
      label: areaKey ? areaKey.charAt(0).toUpperCase() + areaKey.slice(1) : "Geral",
      segment: "Geral"
    };
  }

  function formatDate(value) {
    if (!value) return "Agora há pouco";

    try {
      return dateFormatter.format(new Date(value));
    } catch (error) {
      return value;
    }
  }

  function statusLabel(status) {
    if (status === "filled") return "Preenchida";
    if (status === "pending") return "Pendente";
    return "Aberta";
  }

  function statusPillClass(status) {
    if (status === "filled") return "warm";
    if (status === "pending") return "neutral";
    return "cool";
  }

  function parseList(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function disableDuringSubmit(form, isDisabled) {
    const fields = form.querySelectorAll("input, select, textarea, button");
    fields.forEach((field) => {
      field.disabled = isDisabled;
    });
  }

  function redirectToLogin(message) {
    if (message) setFlashMessage(message);
    window.location.href = projectUrl(`login.html?next=${encodeURIComponent(currentProjectPath())}`);
  }

  function redirectAfterAuth(defaultPath) {
    const nextPath = new URLSearchParams(window.location.search).get("next");

    if (nextPath) {
      const sanitizedNext = String(nextPath).replace(/^\/+Projeto\/?/, "");
      window.location.href = projectUrl(sanitizedNext);
      return;
    }

    if (defaultPath) {
      window.location.href = defaultPath.startsWith("/Projeto/")
        ? defaultPath
        : projectUrl(defaultPath.replace(/^\/+/, ""));
      return;
    }

    window.location.href = state.user && state.user.role === "recruiter"
      ? projectUrl("dashboard-recrutador.html")
      : projectUrl("dashboard.html");
  }

  function syncAuthUi() {
    document.querySelectorAll("[data-auth-cta]").forEach((element) => {
      if (!(element instanceof HTMLAnchorElement)) return;

      if (!state.user) {
        element.href = "login.html";
        element.textContent = "Entrar";
        return;
      }

      if (state.user.role === "recruiter") {
        element.href = "dashboard-recrutador.html";
        element.textContent = "Meu painel";
        return;
      }

      element.href = "dashboard.html";
      element.textContent = "Meu perfil";
    });

    document.querySelectorAll("[data-logout-button]").forEach((button) => {
      button.hidden = !state.user;
    });

    document.querySelectorAll("[data-user-greeting]").forEach((element) => {
      element.textContent = state.user ? state.user.name : "visitante";
    });

    document.querySelectorAll("[data-auth-role]").forEach((element) => {
      const role = element.getAttribute("data-auth-role");
      element.hidden = !state.user || state.user.role !== role;
    });
  }

  function bindLogoutButtons() {
    document.querySelectorAll("[data-logout-button]").forEach((button) => {
      if (button.dataset.logoutBound === "true") return;
      button.dataset.logoutBound = "true";

      button.addEventListener("click", async () => {
        try {
          await request("/api/auth/logout", { method: "POST" });
        } catch (error) {
          // Mesmo se falhar no servidor, limpamos a sessão local.
        }

        resetSession();
        notify("Sessão encerrada.");
        window.location.href = projectUrl("login.html");
      });
    });
  }

  function renderAreaFilters(container, activeArea, handler) {
    if (!container) return;

    const filterAreas = [{ key: "todos", label: "Todas" }, ...state.areas];

    container.innerHTML = filterAreas.map((area) => `
      <button
        type="button"
        class="filter-button${area.key === activeArea ? " active" : ""}"
        data-area-filter="${escapeHtml(area.key)}"
      >
        ${escapeHtml(area.label)}
      </button>
    `).join("");

    container.querySelectorAll("[data-area-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        handler(button.getAttribute("data-area-filter") || "todos");
      });
    });
  }

  function renderPills(values, type = "pill") {
    return values.map((value) => `<span class="${type}">${escapeHtml(value)}</span>`).join("");
  }

  function renderJobCard(job, options = {}) {
    const favoriteAction = state.user && state.user.role === "student"
      ? `
          <button
            type="button"
            class="button button-secondary"
            data-favorite-job="${escapeHtml(job.id)}"
          >
            ${state.favoriteIds.has(job.id) ? "Remover favorito" : "Salvar vaga"}
          </button>
        `
      : !state.user
        ? `<a href="login.html" class="button button-secondary">Entrar para salvar</a>`
        : "";

    const pills = [
      job.primaryAreaLabel,
      job.level,
      job.model,
      ...(job.stack || []).slice(0, 2)
    ];

    return `
      <article class="surface-card job-card reveal active">
        <div class="job-thumb">
          <img src="${escapeHtml(job.image)}" alt="${escapeHtml(job.title)}" />
        </div>
        <div class="job-card-body">
          <div class="job-card-top">
            <div class="job-card-title">
              <h3>${escapeHtml(job.title)}</h3>
              <p>${escapeHtml(job.company ? job.company.name : "Empresa")}</p>
            </div>
            <span class="job-chip accent">${escapeHtml(statusLabel(job.status))}</span>
          </div>

          <p>${escapeHtml(job.summary)}</p>

          <div class="badge-group">
            ${renderPills(pills, "job-chip")}
          </div>

          <div class="job-actions">
            <a href="${escapeHtml(job.detailUrl)}" class="button button-primary">Ver detalhes</a>
            <a href="${escapeHtml(job.link)}" class="button button-secondary" target="_blank" rel="noreferrer">Abrir vaga</a>
            ${favoriteAction}
          </div>
        </div>
      </article>
    `;
  }

  function renderCompanyCard(company) {
    return `
      <article class="surface-card company-showcase-card reveal active">
        <div class="job-thumb">
          <img src="${escapeHtml(company.image)}" alt="${escapeHtml(company.name)}" />
        </div>
        <div class="company-showcase-body">
          <div class="job-card-top">
            <div class="job-card-title">
              <h3>${escapeHtml(company.name)}</h3>
              <p>${escapeHtml(company.sector)}</p>
            </div>
            <span class="job-chip accent">${escapeHtml(company.model)}</span>
          </div>

          <p>${escapeHtml(company.summary)}</p>

          <div class="company-stat-grid">
            <div class="company-stat">
              <strong>${escapeHtml(company.location)}</strong>
              <span>base principal</span>
            </div>
            <div class="company-stat">
              <strong>${escapeHtml(String(company.openJobs))}</strong>
              <span>vaga(s) aberta(s)</span>
            </div>
            <div class="company-stat">
              <strong>${escapeHtml(company.size)}</strong>
              <span>tamanho do time</span>
            </div>
          </div>

          <div class="badge-group">
            ${renderPills(company.areaLabels || [], "job-chip")}
          </div>

          <div class="job-actions">
            <a href="${escapeHtml(company.detailUrl)}" class="button button-primary">Ver empresa</a>
            <a href="vagas.html?companyId=${escapeHtml(company.id)}" class="button button-secondary">Ver vagas</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderStudentCard(student) {
    const contactLinks = [];

    if (student.email) {
      contactLinks.push(`<a href="mailto:${escapeHtml(student.email)}" class="button button-secondary">Email</a>`);
    }

    if (student.phone) {
      const phoneNumber = student.phone.replace(/[^\d+]/g, "");
      contactLinks.push(`<a href="tel:${escapeHtml(phoneNumber)}" class="button button-secondary">Telefone</a>`);
    }

    return `
      <article class="surface-card profile-talent-card reveal active">
        <div class="talent-head">
          <div>
            <p class="mini-label">${escapeHtml(student.segment)}</p>
            <h3>${escapeHtml(student.name)}</h3>
            <p class="talent-subtitle">${escapeHtml(student.course)} | ${escapeHtml(student.preferredAreaLabel)}</p>
          </div>
          <span class="pill pill-soft">${escapeHtml(student.city || "Brasil")}</span>
        </div>

        <p class="talent-copy">${escapeHtml(student.headline || student.goal || "Perfil em início de carreira.")}</p>

        <div class="badge-group">
          ${renderPills((student.skills || []).slice(0, 4), "job-chip")}
        </div>

        <div class="job-actions">
          <a href="${escapeHtml(student.profileUrl)}" class="button button-primary">Ver perfil</a>
          ${contactLinks.join("")}
        </div>
      </article>
    `;
  }

  function renderEmptyState(title, text) {
    return `
      <article class="surface-card empty-panel">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
      </article>
    `;
  }

  async function toggleFavorite(jobId) {
    if (!state.user || state.user.role !== "student") {
      redirectToLogin("Entre com uma conta de aluno para salvar vagas.");
      return;
    }

    const payload = await request(`/api/favorites/${jobId}`, {
      method: "POST"
    });

    updateFavoriteIds((payload.favorites || []).map((job) => job.id));
    notify(payload.saved ? "Vaga salva nos favoritos." : "Vaga removida dos favoritos.");
    return payload;
  }

  async function recordHistory(jobId) {
    if (!state.user || state.user.role !== "student") return;

    try {
      await request(`/api/history/${jobId}`, {
        method: "POST"
      });
    } catch (error) {
      return;
    }
  }

  function setLoading(container, message) {
    if (!container) return;
    container.innerHTML = `<article class="surface-card empty-panel loading-panel"><strong>Carregando</strong><p>${escapeHtml(message)}</p></article>`;
  }

  function bindFavoriteDelegation(root = document) {
    if (root.dataset.favoriteBound === "true") return;
    root.dataset.favoriteBound = "true";

    root.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-favorite-job]");
      if (!button) return;

      event.preventDefault();
      const jobId = button.getAttribute("data-favorite-job");
      if (!jobId) return;

      const previousLabel = button.textContent;
      button.disabled = true;

      try {
        await toggleFavorite(jobId);
        if (typeof window.__conectaRefreshPage === "function") {
          await window.__conectaRefreshPage();
        } else {
          button.textContent = state.favoriteIds.has(jobId) ? "Remover favorito" : "Salvar vaga";
        }
      } catch (error) {
        notify(error.message);
        button.textContent = previousLabel;
      } finally {
        button.disabled = false;
      }
    });
  }

  async function initLoginPage() {
    const form = document.getElementById("login-form");
    const demoList = document.getElementById("demo-login-list");
    const flashMessage = consumeFlashMessage();

    if (flashMessage) {
      notify(flashMessage);
    }

    if (state.user) {
      const note = document.getElementById("login-page-note");
      if (note) {
        note.textContent = `Você já entrou como ${state.user.name}. Se quiser, pode seguir direto para o seu painel.`;
      }
    }

    if (demoList) {
      demoList.innerHTML = `
        <li><strong>Aluno</strong>: larissa@conecta.dev | senha 123456</li>
        <li><strong>Recrutadora</strong>: rh@orbitlabs.com | senha 123456</li>
      `;
    }

    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      disableDuringSubmit(form, true);

      try {
        const payload = await request("/api/auth/login", {
          method: "POST",
          body: {
            email: document.getElementById("login-email")?.value || "",
            password: document.getElementById("login-password")?.value || ""
          }
        });

        saveSession(payload);
        notify("Login realizado com sucesso.");
        redirectAfterAuth(payload.redirectTo);
      } catch (error) {
        notify(error.message);
      } finally {
        disableDuringSubmit(form, false);
      }
    });
  }

  function bindRegisterForm(form, role, buildBody) {
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      disableDuringSubmit(form, true);

      try {
        const payload = await request("/api/auth/register", {
          method: "POST",
          body: {
            role,
            ...buildBody()
          }
        });

        saveSession(payload);
        notify(role === "student" ? "Conta de aluno criada." : "Conta de recrutador criada.");
        redirectAfterAuth(payload.redirectTo);
      } catch (error) {
        notify(error.message);
      } finally {
        disableDuringSubmit(form, false);
      }
    });
  }

  async function initRegisterPage() {
    bindRegisterForm(document.getElementById("student-register-form"), "student", () => ({
      name: document.getElementById("student-name")?.value || "",
      email: document.getElementById("student-email")?.value || "",
      phone: document.getElementById("student-phone")?.value || "",
      course: document.getElementById("student-course")?.value || "",
      password: document.getElementById("student-password")?.value || ""
    }));

    bindRegisterForm(document.getElementById("recruiter-register-form"), "recruiter", () => ({
      name: document.getElementById("recruiter-name")?.value || "",
      email: document.getElementById("recruiter-email")?.value || "",
      phone: document.getElementById("recruiter-phone")?.value || "",
      password: document.getElementById("recruiter-password")?.value || "",
      companyName: document.getElementById("company-name")?.value || "",
      companyFocus: document.getElementById("company-focus")?.value || "",
      companyModel: document.getElementById("company-model")?.value || "",
      companySize: document.getElementById("company-size")?.value || "",
      companyNote: document.getElementById("company-note")?.value || ""
    }));
  }

  async function initJobsPage() {
    const searchInput = document.getElementById("jobs-search");
    const filtersContainer = document.getElementById("jobs-area-filters");
    const jobsGrid = document.getElementById("jobs-grid");
    const jobsCount = document.getElementById("jobs-count");
    const emptyState = document.getElementById("jobs-empty-state");
    const params = new URLSearchParams(window.location.search);
    let selectedArea = params.get("area") || "todos";
    let selectedCompanyId = params.get("companyId") || "";
    let currentSearch = params.get("search") || "";

    if (!jobsGrid || !filtersContainer || !jobsCount) return;

    if (searchInput) {
      searchInput.value = currentSearch;
    }

    function syncQuery() {
      const nextParams = new URLSearchParams();
      if (selectedArea && selectedArea !== "todos") nextParams.set("area", selectedArea);
      if (currentSearch) nextParams.set("search", currentSearch);
      if (selectedCompanyId) nextParams.set("companyId", selectedCompanyId);
      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }

    async function loadJobs() {
      setLoading(jobsGrid, "Buscando vagas com filtros reais.");
      syncQuery();

      try {
        const query = new URLSearchParams();
        if (selectedArea) query.set("area", selectedArea);
        if (currentSearch) query.set("search", currentSearch);
        if (selectedCompanyId) query.set("companyId", selectedCompanyId);

        const data = await request(`/api/jobs?${query.toString()}`);
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];
        jobsCount.textContent = `${jobs.length} vaga${jobs.length === 1 ? "" : "s"} encontrada${jobs.length === 1 ? "" : "s"}`;

        if (!jobs.length) {
          jobsGrid.innerHTML = "";
          if (emptyState) {
            emptyState.classList.add("active");
          }
          return;
        }

        if (emptyState) {
          emptyState.classList.remove("active");
        }

        jobsGrid.innerHTML = jobs.map((job) => renderJobCard(job)).join("");
      } catch (error) {
        jobsGrid.innerHTML = renderEmptyState("Não carreguei as vagas.", error.message);
      }
    }

    const handleAreaChange = (areaKey) => {
      selectedArea = areaKey;
      renderAreaFilters(filtersContainer, selectedArea, handleAreaChange);
      loadJobs();
    };

    window.__conectaRefreshPage = loadJobs;
    renderAreaFilters(filtersContainer, selectedArea, handleAreaChange);

    let searchTimeout = 0;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        currentSearch = searchInput.value.trim();
        window.clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
          loadJobs();
        }, 180);
      });
    }

    await loadJobs();
  }

  async function initJobDetailPage() {
    const detailShell = document.getElementById("job-detail-shell");
    const relatedGrid = document.getElementById("related-jobs-grid");
    const jobId = new URLSearchParams(window.location.search).get("id");

    if (!detailShell || !jobId) return;

    setLoading(detailShell, "Montando a vaga completa.");
    if (relatedGrid) setLoading(relatedGrid, "Separando vagas parecidas.");

    try {
      const data = await request(`/api/jobs/${encodeURIComponent(jobId)}`);
      const { job, company, relatedJobs } = data;

      document.title = `Conecta Estágio | ${job.title}`;

      detailShell.innerHTML = `
        <section class="surface-card detail-hero-card reveal active">
          <div class="detail-hero-copy">
            <span class="eyebrow">${escapeHtml(job.primaryAreaLabel)} | ${escapeHtml(job.segment)}</span>
            <h1>${escapeHtml(job.title)}</h1>
            <p>${escapeHtml(job.summary)}</p>

            <div class="badge-group">
              ${renderPills([job.level, job.model, job.location, statusLabel(job.status)], "job-chip")}
            </div>

            <div class="job-actions">
              <a href="${escapeHtml(job.link)}" class="button button-primary" target="_blank" rel="noreferrer">Abrir candidatura</a>
              ${
                state.user && state.user.role === "student"
                  ? `<button type="button" class="button button-secondary" data-favorite-job="${escapeHtml(job.id)}">${state.favoriteIds.has(job.id) ? "Remover favorito" : "Salvar vaga"}</button>`
                  : `<a href="login.html" class="button button-secondary">Entrar para salvar</a>`
              }
              ${company ? `<a href="${escapeHtml(company.detailUrl)}" class="button button-secondary">Ver empresa</a>` : ""}
            </div>
          </div>

          <div class="detail-hero-image">
            <img src="${escapeHtml(job.image)}" alt="${escapeHtml(job.title)}" />
          </div>
        </section>

        <div class="detail-layout">
          <article class="surface-card detail-section reveal active">
            <div class="panel-title">
              <span class="eyebrow">O que a vaga pede</span>
              <h2>Contexto, rotina e requisitos</h2>
            </div>
            <p class="detail-copy">${escapeHtml(job.description)}</p>
            <div class="detail-list-stack">
              <div>
                <strong>Requisitos principais</strong>
                <ul class="content-list">
                  ${(job.requirements || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                </ul>
              </div>
              <div>
                <strong>Destaques da oportunidade</strong>
                <ul class="content-list">
                  ${(job.highlights || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                </ul>
              </div>
            </div>
          </article>

          <aside class="detail-side">
            <article class="surface-card detail-section reveal active">
              <div class="panel-title">
                <span class="eyebrow">Resumo rápido</span>
                <h2>Leitura objetiva da vaga</h2>
              </div>
              <div class="profile-meta-list">
                <div><strong>Empresa</strong><span>${escapeHtml(company ? company.name : "Empresa parceira")}</span></div>
                <div><strong>Modelo</strong><span>${escapeHtml(job.model)}</span></div>
                <div><strong>Nível</strong><span>${escapeHtml(job.level)}</span></div>
                <div><strong>Área</strong><span>${escapeHtml(job.primaryAreaLabel)}</span></div>
                <div><strong>Local</strong><span>${escapeHtml(job.location)}</span></div>
              </div>
            </article>

            <article class="surface-card detail-section reveal active">
              <div class="panel-title">
                <span class="eyebrow">Stack e ferramentas</span>
                <h2>O que aparece com mais força</h2>
              </div>
              <div class="badge-group">
                ${renderPills(job.stack || [], "job-chip")}
              </div>
            </article>
          </aside>
        </div>
      `;

      if (relatedGrid) {
        relatedGrid.innerHTML = (relatedJobs || []).length
          ? relatedJobs.map((relatedJob) => renderJobCard(relatedJob)).join("")
          : renderEmptyState("Sem vagas relacionadas por agora.", "Quando outras oportunidades da mesma área entrarem, elas aparecem aqui.");
      }

      await recordHistory(job.id);
    } catch (error) {
      detailShell.innerHTML = renderEmptyState("Não encontrei essa vaga.", error.message);
      if (relatedGrid) relatedGrid.innerHTML = "";
    }
  }

  async function initCompaniesPage() {
    const searchInput = document.getElementById("companies-search");
    const filtersContainer = document.getElementById("companies-area-filters");
    const companiesGrid = document.getElementById("companies-grid");
    const companiesCount = document.getElementById("companies-count");
    const emptyState = document.getElementById("companies-empty-state");
    let selectedArea = "todos";
    let currentSearch = "";

    if (!companiesGrid || !filtersContainer || !companiesCount) return;

    async function loadCompanies() {
      setLoading(companiesGrid, "Buscando empresas com apresentação completa.");

      try {
        const query = new URLSearchParams();
        if (selectedArea && selectedArea !== "todos") query.set("area", selectedArea);
        if (currentSearch) query.set("search", currentSearch);

        const data = await request(`/api/companies?${query.toString()}`);
        const companies = Array.isArray(data.companies) ? data.companies : [];

        companiesCount.textContent = `${companies.length} empresa${companies.length === 1 ? "" : "s"} em destaque`;

        if (!companies.length) {
          companiesGrid.innerHTML = "";
          if (emptyState) emptyState.classList.add("active");
          return;
        }

        if (emptyState) emptyState.classList.remove("active");
        companiesGrid.innerHTML = companies.map((company) => renderCompanyCard(company)).join("");
      } catch (error) {
        companiesGrid.innerHTML = renderEmptyState("Não consegui carregar as empresas.", error.message);
      }
    }

    const handleAreaChange = (areaKey) => {
      selectedArea = areaKey;
      renderAreaFilters(filtersContainer, selectedArea, handleAreaChange);
      loadCompanies();
    };

    window.__conectaRefreshPage = loadCompanies;
    renderAreaFilters(filtersContainer, selectedArea, handleAreaChange);

    let searchTimeout = 0;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        currentSearch = searchInput.value.trim();
        window.clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
          loadCompanies();
        }, 180);
      });
    }

    await loadCompanies();
  }

  async function initCompanyDetailPage() {
    const detailShell = document.getElementById("company-detail-shell");
    const jobsGrid = document.getElementById("company-jobs-grid");
    const companyId = new URLSearchParams(window.location.search).get("id");

    if (!detailShell || !companyId) return;

    setLoading(detailShell, "Montando a apresentação completa da empresa.");
    if (jobsGrid) setLoading(jobsGrid, "Buscando vagas dessa empresa.");

    try {
      const data = await request(`/api/companies/${encodeURIComponent(companyId)}`);
      const { company, jobs } = data;
      document.title = `Conecta Estágio | ${company.name}`;

      detailShell.innerHTML = `
        <section class="surface-card detail-hero-card reveal active">
          <div class="detail-hero-copy">
            <span class="eyebrow">${escapeHtml(company.sector)}</span>
            <h1>${escapeHtml(company.name)}</h1>
            <p>${escapeHtml(company.story)}</p>

            <div class="badge-group">
              ${renderPills([company.model, company.location, ...company.areaLabels], "job-chip")}
            </div>

            <div class="job-actions">
              ${company.website ? `<a href="${escapeHtml(company.website)}" class="button button-primary" target="_blank" rel="noreferrer">Site da empresa</a>` : ""}
              ${company.linkedin ? `<a href="${escapeHtml(company.linkedin)}" class="button button-secondary" target="_blank" rel="noreferrer">LinkedIn</a>` : ""}
              <a href="vagas.html?companyId=${escapeHtml(company.id)}" class="button button-secondary">Ver vagas dessa empresa</a>
            </div>
          </div>

          <div class="detail-hero-image">
            <img src="${escapeHtml(company.image)}" alt="${escapeHtml(company.name)}" />
          </div>
        </section>

        <div class="detail-layout">
          <article class="surface-card detail-section reveal active">
            <div class="panel-title">
              <span class="eyebrow">Como ela se apresenta</span>
              <h2>Proposta, cultura e rotina</h2>
            </div>
            <p class="detail-copy">${escapeHtml(company.summary)}</p>
            <div class="detail-list-stack">
              <div>
                <strong>Cultura</strong>
                <p class="detail-copy">${escapeHtml(company.culture)}</p>
              </div>
              <div>
                <strong>Proposta para quem entra</strong>
                <p class="detail-copy">${escapeHtml(company.proposal)}</p>
              </div>
            </div>
          </article>

          <aside class="detail-side">
            <article class="surface-card detail-section reveal active">
              <div class="panel-title">
                <span class="eyebrow">Destaques</span>
                <h2>O que chama atenção aqui</h2>
              </div>
              <ul class="content-list">
                ${(company.highlights || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </article>

            <article class="surface-card detail-section reveal active">
              <div class="panel-title">
                <span class="eyebrow">Dados rápidos</span>
                <h2>Leitura de contexto</h2>
              </div>
              <div class="profile-meta-list">
                <div><strong>Setor</strong><span>${escapeHtml(company.sector)}</span></div>
                <div><strong>Modelo</strong><span>${escapeHtml(company.model)}</span></div>
                <div><strong>Local</strong><span>${escapeHtml(company.location)}</span></div>
                <div><strong>Tamanho</strong><span>${escapeHtml(company.size)}</span></div>
                <div><strong>Vagas abertas</strong><span>${escapeHtml(String(company.openJobs))}</span></div>
              </div>
            </article>
          </aside>
        </div>
      `;

      if (jobsGrid) {
        jobsGrid.innerHTML = (jobs || []).length
          ? jobs.map((job) => renderJobCard(job)).join("")
          : renderEmptyState("Sem vagas abertas agora.", "A empresa segue visível aqui, e as próximas oportunidades entram nessa seção.");
      }
    } catch (error) {
      detailShell.innerHTML = renderEmptyState("Não encontrei essa empresa.", error.message);
      if (jobsGrid) jobsGrid.innerHTML = "";
    }
  }

  function guardRole(requiredRole) {
    if (!state.user) {
      redirectToLogin("Faça login para continuar nessa área.");
      return false;
    }

    if (requiredRole && state.user.role !== requiredRole) {
      const destination = state.user.role === "recruiter"
        ? projectUrl("dashboard-recrutador.html")
        : projectUrl("dashboard.html");
      notify("Esse espaço está reservado para outro tipo de perfil.");
      window.location.href = destination;
      return false;
    }

    return true;
  }

  async function initStudentDashboard() {
    if (!guardRole("student")) return;

    const nameHeading = document.getElementById("student-dashboard-name");
    const metricGrid = document.getElementById("student-dashboard-metrics");
    const summaryCard = document.getElementById("student-profile-summary");
    const favoritesGrid = document.getElementById("student-favorites-grid");
    const historyList = document.getElementById("student-history-list");
    const recommendedGrid = document.getElementById("student-recommended-grid");
    const form = document.getElementById("student-profile-form");

    [
      metricGrid,
      summaryCard,
      favoritesGrid,
      historyList,
      recommendedGrid
    ].filter(Boolean).forEach((container) => {
      setLoading(container, "Buscando seus dados salvos.");
    });

    async function loadDashboard() {
      const data = await request("/api/student/dashboard");
      const { student, favorites, history, recommendedJobs } = data;
      state.user = student;
      updateFavoriteIds(student.favorites || []);
      syncAuthUi();

      if (nameHeading) {
        nameHeading.textContent = student.name;
      }

      if (metricGrid) {
        metricGrid.innerHTML = `
          <article class="surface-card metric-card reveal active">
            <span class="metric-label">Favoritos</span>
            <strong class="metric-value">${favorites.length}</strong>
            <span class="metric-delta">vagas salvas para comparar depois</span>
          </article>
          <article class="surface-card metric-card reveal active">
            <span class="metric-label">Histórico</span>
            <strong class="metric-value">${history.length}</strong>
            <span class="metric-delta">vagas visitadas na sua jornada recente</span>
          </article>
          <article class="surface-card metric-card reveal active">
            <span class="metric-label">Área preferida</span>
            <strong class="metric-value">${escapeHtml(student.preferredAreaLabel)}</strong>
            <span class="metric-delta">segmento principal do seu perfil hoje</span>
          </article>
          <article class="surface-card metric-card reveal active">
            <span class="metric-label">Sugestões</span>
            <strong class="metric-value">${recommendedJobs.length}</strong>
            <span class="metric-delta">vagas próximas do que você quer aprender</span>
          </article>
        `;
      }

      if (summaryCard) {
        summaryCard.innerHTML = `
          <div class="panel-title">
            <span class="eyebrow">Seu perfil público</span>
            <h2>Resumo que recrutadores encontram</h2>
          </div>
          <div class="profile-summary-stack">
            <div class="profile-summary-hero">
              <div>
                <p class="mini-label">${escapeHtml(student.segment)}</p>
                <h3>${escapeHtml(student.name)}</h3>
                <p>${escapeHtml(student.headline || "Seu título ainda pode ficar mais forte.")}</p>
              </div>
              <span class="pill pill-soft">${escapeHtml(student.preferredAreaLabel)}</span>
            </div>
            <div class="profile-meta-list">
              <div><strong>Curso</strong><span>${escapeHtml(student.course)}</span></div>
              <div><strong>Cidade</strong><span>${escapeHtml(student.city || "Ainda não informada")}</span></div>
              <div><strong>Disponibilidade</strong><span>${escapeHtml(student.availability || "Ainda não informada")}</span></div>
              <div><strong>Objetivo</strong><span>${escapeHtml(student.goal || "Ainda não preenchido")}</span></div>
            </div>
            <div class="badge-group">
              ${renderPills(student.skills || [], "job-chip")}
            </div>
            <div class="job-actions">
              <a href="perfil-estudante.html?id=${escapeHtml(student.id)}" class="button button-primary">Ver perfil completo</a>
              <a href="vagas.html" class="button button-secondary">Explorar vagas</a>
            </div>
          </div>
        `;
      }

      if (favoritesGrid) {
        favoritesGrid.innerHTML = favorites.length
          ? favorites.map((job) => renderJobCard(job)).join("")
          : renderEmptyState("Nenhuma vaga favoritada ainda.", "Quando você salvar uma vaga, ela aparece aqui para comparar com calma.");
      }

      if (historyList) {
        historyList.innerHTML = history.length
          ? history.map((entry) => `
              <article class="task-item history-item">
                <strong>${escapeHtml(entry.job.title)}</strong>
                <p>${escapeHtml(entry.job.company ? entry.job.company.name : "Empresa")} | ${escapeHtml(entry.job.primaryAreaLabel)} | vista em ${escapeHtml(formatDate(entry.viewedAt))}</p>
                <div class="job-actions">
                  <a href="${escapeHtml(entry.job.detailUrl)}" class="button button-secondary">Rever vaga</a>
                </div>
              </article>
            `).join("")
          : renderEmptyState("Seu histórico está vazio.", "Assim que você abrir vagas individuais, essa leitura fica salva aqui.");
      }

      if (recommendedGrid) {
        recommendedGrid.innerHTML = recommendedJobs.length
          ? recommendedJobs.map((job) => renderJobCard(job)).join("")
          : renderEmptyState("Sem recomendações por agora.", "Quando mais vagas entrarem na sua área, a sugestão aparece aqui.");
      }

      if (form) {
        document.getElementById("student-profile-headline").value = student.headline || "";
        document.getElementById("student-profile-area").value = student.preferredArea || "";
        document.getElementById("student-profile-city").value = student.city || "";
        document.getElementById("student-profile-availability").value = student.availability || "";
        document.getElementById("student-profile-goal").value = student.goal || "";
        document.getElementById("student-profile-portfolio").value = student.portfolioUrl || "";
        document.getElementById("student-profile-linkedin").value = student.linkedinUrl || "";
        document.getElementById("student-profile-skills").value = (student.skills || []).join(", ");
        document.getElementById("student-profile-bio").value = student.bio || "";
      }
    }

    if (form) {
      const areaSelect = document.getElementById("student-profile-area");
      if (areaSelect) {
        areaSelect.innerHTML = state.areas.map((area) => `
          <option value="${escapeHtml(area.key)}">${escapeHtml(area.label)}</option>
        `).join("");
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        disableDuringSubmit(form, true);

        try {
          await request("/api/students/me", {
            method: "PATCH",
            body: {
              headline: document.getElementById("student-profile-headline")?.value || "",
              preferredArea: document.getElementById("student-profile-area")?.value || "",
              city: document.getElementById("student-profile-city")?.value || "",
              availability: document.getElementById("student-profile-availability")?.value || "",
              goal: document.getElementById("student-profile-goal")?.value || "",
              portfolioUrl: document.getElementById("student-profile-portfolio")?.value || "",
              linkedinUrl: document.getElementById("student-profile-linkedin")?.value || "",
              skills: parseList(document.getElementById("student-profile-skills")?.value || ""),
              bio: document.getElementById("student-profile-bio")?.value || ""
            }
          });

          notify("Perfil atualizado.");
          await loadDashboard();
        } catch (error) {
          notify(error.message);
        } finally {
          disableDuringSubmit(form, false);
        }
      });
    }

    window.__conectaRefreshPage = loadDashboard;
    await loadDashboard();
  }

  async function initRecruiterTalentsPage() {
    if (!guardRole("recruiter")) return;

    const searchInput = document.getElementById("students-search");
    const filtersContainer = document.getElementById("students-area-filters");
    const studentsGrid = document.getElementById("students-grid");
    const studentsCount = document.getElementById("students-count");
    const emptyState = document.getElementById("students-empty-state");
    let selectedArea = "todos";
    let currentSearch = "";

    if (!studentsGrid || !filtersContainer || !studentsCount) return;

    async function loadStudents() {
      setLoading(studentsGrid, "Buscando perfis com filtros reais.");

      try {
        const query = new URLSearchParams();
        if (selectedArea && selectedArea !== "todos") query.set("area", selectedArea);
        if (currentSearch) query.set("search", currentSearch);

        const data = await request(`/api/students?${query.toString()}`);
        const students = Array.isArray(data.students) ? data.students : [];

        studentsCount.textContent = `${students.length} perfil${students.length === 1 ? "" : "s"} encontrado${students.length === 1 ? "" : "s"}`;

        if (!students.length) {
          studentsGrid.innerHTML = "";
          if (emptyState) emptyState.classList.add("active");
          return;
        }

        if (emptyState) emptyState.classList.remove("active");
        studentsGrid.innerHTML = students.map((student) => renderStudentCard(student)).join("");
      } catch (error) {
        studentsGrid.innerHTML = renderEmptyState("Não carreguei os perfis.", error.message);
      }
    }

    const handleAreaChange = (areaKey) => {
      selectedArea = areaKey;
      renderAreaFilters(filtersContainer, selectedArea, handleAreaChange);
      loadStudents();
    };

    window.__conectaRefreshPage = loadStudents;
    renderAreaFilters(filtersContainer, selectedArea, handleAreaChange);

    let searchTimeout = 0;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        currentSearch = searchInput.value.trim();
        window.clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
          loadStudents();
        }, 180);
      });
    }

    await loadStudents();
  }

  async function initStudentProfilePage() {
    if (!state.user) {
      redirectToLogin("Faça login para abrir um perfil completo.");
      return;
    }

    const profileShell = document.getElementById("student-detail-shell");
    const studentId = new URLSearchParams(window.location.search).get("id") || state.user.id;

    if (!profileShell) return;

    setLoading(profileShell, "Montando o perfil completo.");

    try {
      const data = await request(`/api/students/${encodeURIComponent(studentId)}`);
      const { student, favoriteJobs, history } = data;
      const isOwner = state.user && state.user.id === student.id;
      const backLink = document.getElementById("student-detail-back-link");
      document.title = `Conecta Estágio | ${student.name}`;

      if (backLink) {
        backLink.href = state.user && state.user.role === "recruiter" ? "talentos.html" : "dashboard.html";
        backLink.textContent = state.user && state.user.role === "recruiter" ? "Voltar para talentos" : "Voltar ao perfil";
      }

      profileShell.innerHTML = `
        <section class="surface-card detail-hero-card reveal active">
          <div class="detail-hero-copy">
            <span class="eyebrow">${escapeHtml(student.segment)} | ${escapeHtml(student.preferredAreaLabel)}</span>
            <h1>${escapeHtml(student.name)}</h1>
            <p>${escapeHtml(student.headline || student.goal || "Perfil em início de carreira.")}</p>

            <div class="badge-group">
              ${renderPills([student.course, student.city || "Brasil", student.availability || "Disponibilidade a combinar"], "job-chip")}
            </div>

            <div class="job-actions">
              ${student.portfolioUrl ? `<a href="${escapeHtml(student.portfolioUrl)}" class="button button-primary" target="_blank" rel="noreferrer">Portfólio</a>` : ""}
              ${student.linkedinUrl ? `<a href="${escapeHtml(student.linkedinUrl)}" class="button button-secondary" target="_blank" rel="noreferrer">LinkedIn</a>` : ""}
              ${student.email ? `<a href="mailto:${escapeHtml(student.email)}" class="button button-secondary">Email</a>` : ""}
            </div>
          </div>

          <div class="detail-side-stack">
            <article class="surface-card detail-section reveal active">
              <div class="panel-title">
                <span class="eyebrow">Leitura rápida</span>
                <h2>Contato e contexto</h2>
              </div>
              <div class="profile-meta-list">
                <div><strong>Curso</strong><span>${escapeHtml(student.course)}</span></div>
                <div><strong>Área</strong><span>${escapeHtml(student.preferredAreaLabel)}</span></div>
                <div><strong>Cidade</strong><span>${escapeHtml(student.city || "Ainda não informada")}</span></div>
                <div><strong>Telefone</strong><span>${escapeHtml(student.phone)}</span></div>
              </div>
            </article>
          </div>
        </section>

        <div class="detail-layout">
          <article class="surface-card detail-section reveal active">
            <div class="panel-title">
              <span class="eyebrow">Sobre o estudante</span>
              <h2>Objetivo, bio e habilidades</h2>
            </div>
            <p class="detail-copy">${escapeHtml(student.bio || "Esse perfil ainda não ganhou uma bio mais completa.")}</p>

            <div class="detail-list-stack">
              <div>
                <strong>Objetivo</strong>
                <p class="detail-copy">${escapeHtml(student.goal || "Ainda não preenchido.")}</p>
              </div>
              <div>
                <strong>Habilidades</strong>
                <div class="badge-group">
                  ${renderPills(student.skills || [], "job-chip")}
                </div>
              </div>
            </div>
          </article>

          <aside class="detail-side">
            <article class="surface-card detail-section reveal active">
              <div class="panel-title">
                <span class="eyebrow">${isOwner ? "Seus favoritos" : "Favoritos do perfil"}</span>
                <h2>Vagas que chamaram atenção</h2>
              </div>
              <div class="mini-stack">
                ${
                  favoriteJobs.length
                    ? favoriteJobs.map((job) => `
                        <article class="mini-job-item">
                          <strong>${escapeHtml(job.title)}</strong>
                          <p>${escapeHtml(job.company ? job.company.name : "Empresa")} | ${escapeHtml(job.primaryAreaLabel)}</p>
                          <a href="${escapeHtml(job.detailUrl)}" class="button button-secondary">Abrir vaga</a>
                        </article>
                      `).join("")
                    : renderEmptyState("Sem favoritos ainda.", "Quando esse perfil salvar vagas, elas aparecem aqui.")
                }
              </div>
            </article>

            <article class="surface-card detail-section reveal active">
              <div class="panel-title">
                <span class="eyebrow">${isOwner ? "Seu histórico" : "Histórico recente"}</span>
                <h2>Últimas vagas vistas</h2>
              </div>
              <div class="mini-stack">
                ${
                  history.length
                    ? history.map((entry) => `
                        <article class="mini-job-item">
                          <strong>${escapeHtml(entry.job.title)}</strong>
                          <p>${escapeHtml(formatDate(entry.viewedAt))}</p>
                          <a href="${escapeHtml(entry.job.detailUrl)}" class="button button-secondary">Rever</a>
                        </article>
                      `).join("")
                    : renderEmptyState("Sem histórico por enquanto.", "As vagas abertas por esse perfil aparecem aqui quando ele navegar mais.")
                }
              </div>
            </article>
          </aside>
        </div>
      `;
    } catch (error) {
      profileShell.innerHTML = renderEmptyState("Não carreguei esse perfil.", error.message);
    }
  }

  function computeDonutBackground(accessed, filled, pending) {
    const total = Math.max(accessed + filled + pending, 1);
    const accessedEnd = (accessed / total) * 100;
    const filledEnd = accessedEnd + (filled / total) * 100;

    return `
      radial-gradient(circle at center, rgba(7, 12, 22, 0.92) 0 44%, transparent 45%),
      conic-gradient(
        rgba(57, 198, 214, 0.98) 0 ${accessedEnd}%,
        rgba(255, 123, 92, 0.98) ${accessedEnd}% ${filledEnd}%,
        rgba(129, 146, 255, 0.96) ${filledEnd}% 100%
      )
    `;
  }

  async function initRecruiterDashboard() {
    if (!guardRole("recruiter")) return;

    const recruiterName = document.getElementById("recruiter-name-heading");
    const recruiterTitle = document.getElementById("recruiter-title-heading");
    const spotlightText = document.getElementById("recruiter-spotlight-text");
    const metricsGrid = document.getElementById("recruiter-dashboard-metrics");
    const jobsList = document.getElementById("recruiter-jobs-list");
    const topStudents = document.getElementById("recruiter-top-students");
    const form = document.getElementById("recruiter-job-form");
    const companyHint = document.getElementById("recruiter-company-hint");
    const donut = document.getElementById("recruiter-donut-chart");
    const donutTotal = document.getElementById("recruiter-donut-total");
    const accessedLabel = document.getElementById("recruiter-accessed-label");
    const filledLabel = document.getElementById("recruiter-filled-label");
    const pendingLabel = document.getElementById("recruiter-pending-label");
    const noteOne = document.getElementById("recruiter-note-one");
    const noteTwo = document.getElementById("recruiter-note-two");
    const noteThree = document.getElementById("recruiter-note-three");

    [metricsGrid, jobsList, topStudents].filter(Boolean).forEach((container) => {
      setLoading(container, "Conferindo dados reais do painel.");
    });

    async function loadRecruiterDashboard() {
      const data = await request("/api/recruiter/dashboard");
      const { recruiter, company, metrics, jobs, topStudents: matchedStudents } = data;

      if (recruiterName) recruiterName.textContent = recruiter.name;
      if (recruiterTitle) {
        recruiterTitle.textContent = company
          ? `${company.name} publica vagas, acompanha o interesse e acessa perfis completos em um fluxo só.`
          : "Painel do recrutador com vagas e talentos.";
      }

      if (spotlightText) {
        spotlightText.textContent = company
          ? company.proposal
          : "Esse painel reúne publicação de vaga, leitura de métricas e acesso aos talentos da plataforma.";
      }

      if (companyHint) {
        companyHint.textContent = company
          ? `Nova vaga vinculada automaticamente à ${company.name}.`
          : "As vagas entram ligadas à empresa do recrutador.";
      }

      if (metricsGrid) {
        metricsGrid.innerHTML = `
          <article class="surface-card metric-card reveal active">
            <span class="metric-label">Vagas no painel</span>
            <strong class="metric-value">${metrics.totalJobs}</strong>
            <span class="metric-delta">${metrics.open} abertas, ${metrics.pending} pendentes e ${metrics.filled} preenchidas</span>
          </article>
          <article class="surface-card metric-card reveal active">
            <span class="metric-label">Acessos</span>
            <strong class="metric-value">${metrics.accessed}</strong>
            <span class="metric-delta">visitas registradas nas vagas da empresa</span>
          </article>
          <article class="surface-card metric-card reveal active">
            <span class="metric-label">Favoritos</span>
            <strong class="metric-value">${metrics.favoriteHits}</strong>
            <span class="metric-delta">salvamentos feitos por estudantes</span>
          </article>
          <article class="surface-card metric-card reveal active">
            <span class="metric-label">Empresa</span>
            <strong class="metric-value">${escapeHtml(company ? company.name : "Painel")}</strong>
            <span class="metric-delta">${escapeHtml(company ? company.location : "Brasil")} | ${escapeHtml(company ? company.model : "Híbrido")}</span>
          </article>
        `;
      }

      const totalCycles = metrics.accessed + metrics.filled + metrics.pending;
      if (donut) {
        donut.style.background = computeDonutBackground(metrics.accessed, metrics.filled, metrics.pending);
      }
      if (donutTotal) donutTotal.textContent = String(totalCycles);
      if (accessedLabel) accessedLabel.textContent = `${metrics.accessed} acessadas`;
      if (filledLabel) filledLabel.textContent = `${metrics.filled} preenchidas`;
      if (pendingLabel) pendingLabel.textContent = `${metrics.pending} pendentes`;
      if (noteOne) {
        const topOpen = jobs.find((job) => job.status === "open") || jobs[0];
        noteOne.textContent = topOpen
          ? `${topOpen.title} está puxando a leitura mais forte do painel agora.`
          : "As vagas abertas começam a gerar leitura assim que estudantes entram nos detalhes.";
      }
      if (noteTwo) {
        const hottestArea = jobs[0] ? getAreaMeta(jobs[0].primaryArea).label : "Tecnologia";
        noteTwo.textContent = `A área com mais contexto neste momento é ${hottestArea}, então vale manter descrição e link bem claros.`;
      }
      if (noteThree) {
        noteThree.textContent = metrics.pending
          ? "As vagas pendentes ainda pedem ajuste fino no resumo ou no link externo para converter melhor."
          : "Sem pendências agora. O fluxo está mais limpo para continuar publicando vagas novas.";
      }

      if (jobsList) {
        jobsList.innerHTML = jobs.length
          ? jobs.map((job) => `
              <article class="surface-card recruiter-job-item reveal active">
                <div class="job-row-head">
                  <div>
                    <p class="mini-label">${escapeHtml(job.primaryAreaLabel)} | ${escapeHtml(job.level)}</p>
                    <h3>${escapeHtml(job.title)}</h3>
                    <p>${escapeHtml(job.summary)}</p>
                  </div>
                  <span class="pill pill-status ${statusPillClass(job.status)}">${escapeHtml(statusLabel(job.status))}</span>
                </div>

                <div class="badge-group">
                  ${renderPills([job.model, job.location, ...(job.stack || []).slice(0, 3)], "job-chip")}
                </div>

                <div class="job-row-actions">
                  <label class="field compact-field">
                    <span>Status</span>
                    <select data-job-status="${escapeHtml(job.id)}">
                      <option value="open"${job.status === "open" ? " selected" : ""}>Aberta</option>
                      <option value="pending"${job.status === "pending" ? " selected" : ""}>Pendente</option>
                      <option value="filled"${job.status === "filled" ? " selected" : ""}>Preenchida</option>
                    </select>
                  </label>
                  <a href="${escapeHtml(job.detailUrl)}" class="button button-secondary">Ver vaga</a>
                  <a href="${escapeHtml(job.link)}" class="button button-secondary" target="_blank" rel="noreferrer">Abrir link</a>
                </div>
              </article>
            `).join("")
          : renderEmptyState("Nenhuma vaga publicada ainda.", "Quando a empresa criar a primeira vaga, ela entra aqui com status editável.");
      }

      if (topStudents) {
        topStudents.innerHTML = matchedStudents.length
          ? matchedStudents.map((student) => renderStudentCard(student)).join("")
          : renderEmptyState("Sem talentos mapeados por agora.", "Assim que houver perfis combinando com suas áreas, eles aparecem aqui.");
      }
    }

    if (form) {
      const areaSelect = document.getElementById("recruiter-vacancy-area");
      if (areaSelect) {
        areaSelect.innerHTML = `
          <option value="">Selecione</option>
          ${state.areas.map((area) => `<option value="${escapeHtml(area.key)}">${escapeHtml(area.label)}</option>`).join("")}
        `;
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        disableDuringSubmit(form, true);

        try {
          await request("/api/jobs", {
            method: "POST",
            body: {
              title: document.getElementById("recruiter-vacancy-title")?.value || "",
              primaryArea: document.getElementById("recruiter-vacancy-area")?.value || "",
              model: document.getElementById("recruiter-vacancy-model")?.value || "",
              level: document.getElementById("recruiter-vacancy-level")?.value || "",
              location: document.getElementById("recruiter-vacancy-location")?.value || "",
              stack: parseList(document.getElementById("recruiter-vacancy-stack")?.value || ""),
              requirements: parseList(document.getElementById("recruiter-vacancy-requirements")?.value || ""),
              highlights: parseList(document.getElementById("recruiter-vacancy-highlights")?.value || ""),
              summary: document.getElementById("recruiter-vacancy-summary")?.value || "",
              description: document.getElementById("recruiter-vacancy-description")?.value || "",
              link: document.getElementById("recruiter-vacancy-link")?.value || ""
            }
          });

          form.reset();
          notify("Vaga publicada com persistência real.");
          await loadRecruiterDashboard();
        } catch (error) {
          notify(error.message);
        } finally {
          disableDuringSubmit(form, false);
        }
      });

      form.querySelectorAll("input, select, textarea").forEach((field) => {
        field.disabled = false;
      });
    }

    document.addEventListener("change", async (event) => {
      const select = event.target.closest("[data-job-status]");
      if (!select) return;

      try {
        select.disabled = true;
        await request(`/api/jobs/${select.getAttribute("data-job-status")}`, {
          method: "PATCH",
          body: {
            status: select.value
          }
        });
        notify("Status da vaga atualizado.");
        await loadRecruiterDashboard();
      } catch (error) {
        notify(error.message);
      } finally {
        select.disabled = false;
      }
    });

    window.__conectaRefreshPage = loadRecruiterDashboard;
    await loadRecruiterDashboard();
  }

  function prefillCommunityProfile() {
    const roleField = document.getElementById("post-role");
    const courseField = document.getElementById("post-course");

    if (!roleField || !courseField || !state.user) return;

    if (state.user.role === "student") {
      roleField.value = "student";
      courseField.value = state.user.course || courseField.value;
      return;
    }

    roleField.value = "recruiter";
    courseField.value = state.user.companyName || courseField.value;
  }

  async function bootstrap() {
    bindFavoriteDelegation(document.body);
    bindLogoutButtons();

    try {
      const config = await request("/api/config");
      state.areas = Array.isArray(config.areas) ? config.areas : [];
    } catch (error) {
      state.areas = [];
    }

    if (state.token) {
      try {
        const session = await request("/api/auth/session");
        if (session.authenticated && session.user) {
          state.user = session.user;
          updateFavoriteIds(session.user.favorites || []);
        } else {
          resetSession();
        }
      } catch (error) {
        resetSession();
      }
    }

    syncAuthUi();
    prefillCommunityProfile();

    if (currentPage === "login.html") {
      await initLoginPage();
      return;
    }

    if (currentPage === "cadastro.html") {
      await initRegisterPage();
      return;
    }

    if (currentPage === "vagas.html") {
      await initJobsPage();
      return;
    }

    if (currentPage === "vaga.html") {
      await initJobDetailPage();
      return;
    }

    if (currentPage === "empresas.html") {
      await initCompaniesPage();
      return;
    }

    if (currentPage === "empresa.html") {
      await initCompanyDetailPage();
      return;
    }

    if (currentPage === "dashboard.html") {
      await initStudentDashboard();
      return;
    }

    if (currentPage === "talentos.html") {
      await initRecruiterTalentsPage();
      return;
    }

    if (currentPage === "perfil-estudante.html") {
      await initStudentProfilePage();
      return;
    }

    if (currentPage === "dashboard-recrutador.html") {
      await initRecruiterDashboard();
    }
  }

  return {
    bootstrap
  };
})();

window.addEventListener("DOMContentLoaded", () => {
  conectaPlatform.bootstrap().catch((error) => {
    console.error(error);
  });
});
