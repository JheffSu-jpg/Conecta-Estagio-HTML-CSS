# Conecta Estagio

Conecta Estagio e um projeto front-end conceitual pensado como portfolio para nivel estagio. A proposta foi sair do formato de landing page solta e montar algo com mais cara de produto real, organizando vagas, cadastro, area do recrutador, perfis de estudantes, comunidade e apresentacao de empresas em uma experiencia unica. Agora ele tambem tem uma camada opcional de IA real via servidor local, sem expor chave no navegador.

## Contexto da ideia

Me chamo Jeferson e estou no segundo periodo de ADS. A ideia do projeto nasceu de uma dor muito proxima do meu momento: perceber como estudantes que estao tentando conseguir a primeira oportunidade quase sempre encontram uma jornada confusa, fria e espalhada entre varios lugares.

Em muitos casos, a pessoa encontra:

- vaga sem contexto
- empresa sem apresentacao
- formulario cansativo
- pouca troca real sobre processo seletivo
- quase nenhuma ponte entre estudante e recrutador

Por isso, a proposta do Conecta Estagio foi imaginar uma plataforma que deixasse esse comeco mais claro, mais humano e mais proximo da vida real.

## O que o projeto entrega hoje

Na versao atual, a plataforma se organiza assim:

- home com proposta do produto e narrativa mais autoral
- pagina de vagas com filtros por area tech
- cadastro separado para aluno e recrutador
- area do recrutador para publicar vagas com link externo
- pagina separada de perfis dos estudantes
- comunidade com interacao entre alunos e recrutadores
- pagina de empresas com apresentacao mais humana
- assistente Conecta IA com avatar proprio, modo demo no front e modo real opcional via servidor local

## Foco atual

Hoje, o projeto esta concentrado em inicio de carreira na area de tecnologia, com foco em:

- Front-end
- Back-end
- Full stack
- Dados
- Suporte
- Produto digital

Esse recorte foi intencional para manter coerencia com o meu contexto atual em ADS e com o tipo de publico que eu queria representar.

## Expansao futura da ideia

A proposta nao precisa ficar presa so ao universo tech. Se o conceito evoluir, a ideia e abrir espaco tambem para outras areas, como:

- Enfermagem
- Administracao
- Logistica
- Pedagogia
- Recursos Humanos
- Design

O mais importante seria manter a mesma intencao da plataforma: aproximar estudante, empresa e recrutador de um jeito menos travado e mais honesto.

## Diferenciais do projeto

- fluxo mais realista do que uma landing page isolada
- linguagem jovem e mais proxima do universo universitario
- visual escuro com identidade mais forte
- filtros e interacoes em JavaScript puro
- separacao clara entre jornada publica do estudante e operacao do recrutador
- comunidade como unico espaco de troca entre os dois lados
- marca visual propria, com logo aplicado em todas as paginas
- camada de IA progressiva: funciona no front sem backend e pode subir para modo real com OpenAI

## Estrutura das telas

- `Projeto/index.html`
  home principal e apresentacao do conceito
- `Projeto/vagas.html`
  feed de vagas com filtros por area
- `Projeto/cadastro.html`
  cadastro de aluno e de recrutador
- `Projeto/dashboard-recrutador.html`
  area do recrutador com publicacao de vaga
- `Projeto/dashboard.html`
  pagina de perfis dos estudantes
- `Projeto/comunidade.html`
  comunidade com alunos e recrutadores
- `Projeto/empresas.html`
  apresentacao das empresas
- `CSS/style.css`
  identidade visual, responsividade e refinamento de interface
- `JS/script.js`
  interacoes do projeto e assistente Conecta IA
- `assets/conecta-logo.png`
  logo do site com fundo transparente
- `server.js`
  servidor local opcional para servir o projeto e ligar a Conecta IA em modo real

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript puro
- Node.js para o servidor local da IA
- OpenAI Responses API no modo real da assistente
- imagens externas via Unsplash

## O que esse projeto demonstra no portfolio

Como case de portfolio, esse projeto mostra:

- organizacao de varias paginas conectadas
- cuidado com hierarquia visual e consistencia de interface
- pensamento de produto, e nao so de tela isolada
- preocupacao com copy, navegacao e experiencia
- capacidade de iterar, corrigir e refinar um projeto ao longo do tempo

## Como abrir o projeto

1. Abra a pasta do projeto no editor.
2. Para navegar no modo normal, abra `Projeto/index.html` no navegador ou use um servidor local simples.
3. Para ligar a IA real, rode `server.js` e abra `http://localhost:3000`.

## Como ativar a Conecta IA em modo real

1. Gere sua chave na plataforma da OpenAI.
2. No PowerShell, rode:
   `$env:OPENAI_API_KEY="sua-chave"; node server.js`
3. Abra `http://localhost:3000`.
4. Clique na assistente e use `Atualizar status`.

Observacao:
- O modo demo continua funcionando sem servidor.
- O modo real usa a Responses API por tras de um servidor local porque a documentacao oficial da OpenAI orienta a nao expor chave em codigo client-side.

## Melhorias futuras

- autenticacao e login
- persistencia real com backend
- pagina individual de vaga
- perfil individual completo de estudante
- favoritos e historico de vagas
- busca por palavra-chave
- pagina individual para cada empresa
- expansao para outras areas alem de tecnologia

## Observacao final

Esse projeto foi construido como estudo e portfolio, mas a intencao dele sempre foi parecer algo que poderia existir de verdade. Por isso, o foco nao ficou so no visual: a estrutura das paginas, o tom dos textos e a separacao dos fluxos tambem foram pensados para deixar a experiencia mais crivel.
