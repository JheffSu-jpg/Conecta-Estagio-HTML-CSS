# Conecta Estagio

Conecta Estagio e um projeto de portfolio pensado para parecer menos uma landing page isolada e mais um produto pequeno, com fluxo de estudante, fluxo de recrutador, vagas, empresas, comunidade, autenticacao e persistencia local.

## Contexto da ideia

Me chamo Jeferson e estou no segundo periodo de ADS. A ideia do projeto nasceu de uma dor muito proxima do meu momento: perceber como estudantes que estao tentando conseguir a primeira oportunidade quase sempre encontram uma jornada fria, confusa e espalhada entre varios lugares.

Eu queria imaginar uma plataforma em que:

- a vaga tivesse mais contexto
- a empresa se apresentasse melhor
- o cadastro nao cansasse logo na entrada
- o recrutador tivesse uma area propria
- a troca entre os dois lados acontecesse num espaco mais humano

## O que o projeto entrega hoje

Na versao atual, o projeto ja tem:

- home com narrativa pessoal e proposta da plataforma
- autenticacao e login para estudante e recrutador
- persistencia real em backend local com banco JSON
- pagina de vagas com busca por palavra-chave e filtro por area
- pagina individual para cada vaga
- favoritos e historico reais para o estudante
- area do estudante com perfil editavel e recomendacoes
- pagina individual completa para cada estudante
- area do recrutador com publicacao real de vagas
- grafico do ciclo com vagas acessadas, preenchidas e pendentes
- pagina de talentos separada para recrutadores
- pagina de empresas com busca, filtros e pagina individual para cada empresa
- comunidade com participacao de estudantes e recrutadores
- assistente Conecta IA com modo demo no front e modo real opcional via servidor local

## Areas trabalhadas

O projeto nasceu com foco em tecnologia, mas agora a base local ja contempla outras trilhas tambem.

Areas atuais:

- Front-end
- Back-end
- Full stack
- Dados
- Suporte
- Produto digital
- Design
- Enfermagem
- Administracao
- Logistica
- Pedagogia

## Diferenciais do projeto

- fluxo mais realista do que uma landing page comum
- separacao clara entre jornada publica, estudante e recrutador
- linguagem mais jovem e mais proxima da realidade universitaria
- visual escuro com identidade propria
- varias paginas conectadas com comportamento real
- favoritos, historico e perfis com persistencia local
- assistente integrada ao proprio produto

## Estrutura principal

- `Projeto/index.html`
  home principal
- `Projeto/login.html`
  login de estudante e recrutador
- `Projeto/cadastro.html`
  cadastro real com senha
- `Projeto/vagas.html`
  listagem dinamica de vagas
- `Projeto/vaga.html`
  pagina individual da vaga
- `Projeto/empresas.html`
  listagem dinamica de empresas
- `Projeto/empresa.html`
  pagina individual da empresa
- `Projeto/dashboard.html`
  area do estudante
- `Projeto/perfil-estudante.html`
  perfil individual completo do estudante
- `Projeto/dashboard-recrutador.html`
  area do recrutador
- `Projeto/talentos.html`
  busca de perfis para recrutadores
- `Projeto/comunidade.html`
  comunidade
- `CSS/style.css`
  identidade visual e responsividade
- `JS/script.js`
  interacoes visuais e Conecta IA
- `JS/platform.js`
  autenticacao, sessao, API e renderizacao dinamica
- `server.js`
  servidor local, API e persistencia
- `data/db.json`
  banco local gerado automaticamente

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript puro
- Node.js
- banco JSON local
- OpenAI Responses API para o modo real da assistente
- imagens externas via Unsplash

## Como rodar

1. Abra a pasta do projeto.
2. No terminal, rode:
   `node server.js`
3. Abra:
   `http://localhost:3000`

## Contas de demonstracao

- estudante
  `larissa@conecta.dev`
  senha: `123456`

- recrutador
  `rh@orbitlabs.com`
  senha: `123456`

## Como ativar a Conecta IA em modo real

1. Gere sua chave na OpenAI.
2. No PowerShell, rode:
   `$env:OPENAI_API_KEY="sua-chave"; node server.js`
3. Abra `http://localhost:3000`.

Sem chave, a assistente continua em modo demo dentro do proprio site.

## O que esse projeto demonstra no portfolio

Como case de portfolio, ele mostra:

- organizacao de varias paginas conectadas
- construcao de fluxo real de produto
- consumo de API e persistencia local
- cuidado com copy, UX e hierarquia visual
- separacao de papeis e regras de acesso
- capacidade de evoluir um projeto alem do visual

## Observacao final

Esse projeto continua sendo um estudo, mas a intencao dele foi sair do nivel de vitrine e chegar mais perto de um produto pequeno, com fluxo, estado, login, dados salvos e paginas que conversam entre si.
