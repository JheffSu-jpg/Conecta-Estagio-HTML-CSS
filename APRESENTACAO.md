# Apresentacao Do Projeto

## Resumo rapido

Conecta Estagio e uma plataforma conceitual criada para aproximar estudantes e recrutadores de um jeito mais claro e mais humano. O projeto nasceu como case de portfolio front-end, mas foi evoluindo para um produto pequeno com autenticacao, backend local, persistencia e paginas conectadas.

## Contexto pessoal

Me chamo Jeferson e estou no segundo periodo de ADS. A ideia nasceu muito da minha propria vivencia e da realidade de varios estudantes que estao tentando conseguir o primeiro estagio.

O que eu percebi foi que essa jornada normalmente e fragmentada:

- a vaga aparece sem muito contexto
- a empresa quase nao se apresenta
- o cadastro costuma ser pesado
- falta troca real sobre processo seletivo
- estudante e recrutador parecem mundos separados

Foi a partir disso que pensei em uma plataforma que organizasse melhor esse comeco.

## Problema que o projeto tenta resolver

Quem esta entrando no mercado nao precisa so de uma lista de vagas. Tambem precisa entender:

- onde faz sentido aplicar
- quem esta contratando
- como se apresentar melhor
- como rever as vagas que gostou
- como ouvir experiencias de quem esta vivendo ou conduzindo esse processo

## Solucao proposta

O projeto foi organizado em papeis e fluxos separados:

- estudante cria conta, entra no proprio painel e acessa vagas, favoritos e historico
- recrutador cria conta, entra numa area propria e publica vagas com link externo
- cada vaga ganhou pagina individual
- cada empresa ganhou pagina individual
- cada estudante ganhou perfil individual completo
- a comunidade segue como ponto de troca entre os dois lados
- a Conecta IA ajuda no site com dicas rapidas e pode rodar em modo demo ou modo real

## O que mostrar na apresentacao

### 1. Home

Mostre que a home apresenta a ideia do projeto com uma narrativa mais pessoal e menos generica.

### 2. Login e cadastro

Mostre que agora existe autenticacao real, com cadastro de estudante e recrutador, senha e redirecionamento para areas diferentes.

### 3. Pagina de vagas

Mostre a busca por palavra-chave, os filtros por area e a expansao para outras trilhas alem de tecnologia.

### 4. Pagina individual da vaga

Explique que a vaga deixou de ser so um card e passou a ter contexto, requisitos, destaques e empresa ligada a ela.

### 5. Area do estudante

Mostre favoritos, historico, recomendacoes e edicao real do perfil.

### 6. Perfil individual do estudante

Mostre bio, objetivo, habilidades, links e leitura completa do perfil em pagina separada.

### 7. Area do recrutador

Mostre publicacao real de vaga, link externo, atualizacao de status e grafico do ciclo.

### 8. Pagina de talentos

Mostre a busca por perfis com filtro por area, curso e palavra-chave.

### 9. Empresas

Mostre a listagem dinamica e depois abra uma pagina individual de empresa com proposta, cultura e vagas.

### 10. Conecta IA

Mostre a assistente fixa do site, o avatar proprio e explique que ela funciona em duas camadas:

- modo demo no front
- modo real via servidor local com OpenAI

## Decisoes tecnicas

- HTML, CSS e JavaScript puro para mostrar base solida de front-end
- backend local em Node.js
- persistencia em arquivo JSON para simular banco em ambiente simples
- separacao entre pagina publica, area do estudante e area do recrutador
- paginas individuais para vaga, empresa e estudante
- filtros e busca ligados a API real

## O que esse projeto mostra sobre voce

- voce pensa em fluxo, nao so em tela
- voce consegue conectar front-end com backend simples
- voce sabe estruturar estados de sessao, favoritos e historico
- voce tem cuidado com UX, texto e hierarquia visual
- voce consegue iterar um case e aumentar bastante a complexidade dele

## Versao curta para falar em 1 minuto

Esse projeto se chama Conecta Estagio. Eu criei essa ideia pensando em estudantes que estao tentando entrar no mercado e normalmente encontram uma jornada muito confusa entre vagas, cadastro, empresa e processo seletivo. Em vez de fazer uma landing page simples, eu montei uma pequena plataforma com autenticacao, backend local, busca por vagas, paginas individuais, area do estudante, area do recrutador, empresas, comunidade e uma assistente integrada. O foco foi mostrar repertorio de front-end, pensamento de produto e capacidade de evoluir o projeto para algo mais real.

## Versao um pouco mais completa para entrevista

O Conecta Estagio nasceu da vontade de construir algo mais proximo da vida real de quem procura o primeiro estagio. Como estou no segundo periodo de ADS, comecei pela area tech, mas depois expandi a base para outras areas como enfermagem, administracao, logistica, design e pedagogia. A estrutura separa bem os papeis: o estudante entra no proprio painel, salva vagas, acompanha historico e completa o perfil; o recrutador publica vagas, atualiza status e acessa talentos em uma area separada. Tambem criei paginas individuais para vaga, empresa e estudante, alem de uma assistente com modo demo e modo real via servidor local. Visualmente, trabalhei com uma base escura, logo proprio, cards mais robustos e um tom mais humano.

## Contas de demonstracao

- estudante
  `larissa@conecta.dev`
  senha `123456`

- recrutador
  `rh@orbitlabs.com`
  senha `123456`

## Possiveis perguntas e respostas

### Por que voce escolheu esse tema?

Porque estagio e primeiro emprego sao dores muito proximas do meu momento e porque eu queria construir um case que tivesse relacao real com o publico que eu queria representar.

### Qual foi a principal preocupacao de UX?

Deixar a experiencia clara, separar bem os fluxos e nao cansar o estudante logo no cadastro.

### Por que usar backend local?

Porque eu queria sair do nivel de prototipo so visual e mostrar autenticacao, persistencia, sessao e consumo de API de forma simples e demonstravel.

### Por que a IA real usa servidor local?

Porque a OpenAI orienta a nao expor chave em codigo client-side. Entao eu mantive uma experiencia em camadas: no navegador ela ja funciona em modo demo, e quando eu quero demonstrar a versao real, rodo um servidor local com a chave protegida no ambiente.

### O que esse projeto tem hoje que antes nao tinha?

Login, backend local, dados persistidos, pagina individual de vaga, pagina individual de empresa, perfil completo de estudante, favoritos, historico e busca por palavra-chave.

### O que voce melhoraria com mais tempo?

Eu pensaria em banco de dados de verdade, comentarios persistidos na comunidade, upload de imagem e talvez candidatura interna alem do link externo.
