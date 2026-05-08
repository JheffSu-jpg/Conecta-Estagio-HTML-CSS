# Apresentacao Do Projeto

## Resumo rapido

Conecta Estagio e uma plataforma conceitual criada para aproximar estudantes e recrutadores de um jeito mais claro e mais humano. O projeto nasceu como um case de portfolio front-end, mas foi pensado para ter mais profundidade do que uma landing page simples.

## Contexto pessoal

Me chamo Jeferson e estou no segundo periodo de ADS. A ideia veio muito da minha propria vivencia e da realidade de varios estudantes que estao tentando conseguir o primeiro estagio.

O que eu percebi foi que essa jornada normalmente e fragmentada:

- a vaga aparece sem muito contexto
- a empresa quase nao se apresenta
- o cadastro costuma ser pesado
- falta troca real sobre processo seletivo
- estudante e recrutador parecem mundos separados

Foi a partir disso que pensei em uma plataforma que organizasse melhor esse comeco.

## Problema que o projeto tenta resolver

Quem esta entrando no mercado costuma lidar com uma experiencia muito confusa. Nao e so sobre encontrar vaga, mas sobre entender:

- onde faz sentido aplicar
- quem esta contratando
- como se apresentar melhor
- como ouvir experiencias de quem ja passou por isso

O Conecta Estagio tenta responder a isso com um fluxo mais simples, mais proximo e menos frio.

## Solucao proposta

O projeto foi organizado em papeis separados:

- o estudante entra com um cadastro enxuto
- ele acessa vagas e comunidade
- o recrutador entra em uma area propria
- nessa area ele publica vagas com link externo
- o recrutador tambem acessa os perfis dos estudantes em uma pagina separada
- a comunidade vira o ponto de troca entre os dois lados
- uma assistente chamada Conecta IA aparece no site para orientar estudante e recrutador com dicas rapidas
- ela funciona em modo demo no proprio front e tambem pode ligar um modo real via servidor local

## O que mostrar na apresentacao

### 1. Home

Mostre que a home ja apresenta a ideia do projeto de forma mais humana, inclusive com a narrativa pessoal por tras da plataforma.

### 2. Pagina de vagas

Mostre os filtros por area tech e explique que a intencao foi reduzir ruido para o estudante focar no que realmente combina com ele.

### 3. Cadastro

Destaque que o formulario do aluno foi reduzido ao essencial, enquanto o recrutador entra por um fluxo proprio.

### 4. Area do recrutador

Mostre que a publicacao de vaga foi centralizada nessa area, com campo de link para empresa ou LinkedIn e uma leitura mais organizada da operacao.

### 5. Perfis dos estudantes

Explique que a leitura de perfis foi separada da navegacao publica para deixar a experiencia do recrutador mais coerente.

### 6. Comunidade

Mostre que alunos e recrutadores podem conversar, mas com identificacao visual para o papel do recrutador.

### 7. Empresas

Apresente a pagina como uma vitrine em que a empresa deixa de ser so um nome em card de vaga e passa a ter contexto, imagem e proposta.

### 8. Conecta IA

Mostre a assistente fixa do site, o avatar proprio dela e explique que ela foi adicionada para orientar estudantes e recrutadores com dicas de portfolio, entrevista, leitura de vaga, apresentacao de empresa e escrita de vaga.

Se quiser aprofundar, vale comentar que ela trabalha em duas camadas:

- modo demo, que funciona so com o front
- modo real, que usa OpenAI por um servidor local para nao expor chave no navegador

## Decisoes de design

- paleta escura para dar mais peso visual e mais cara de produto
- tipografia mais forte para fugir do visual generico
- cards robustos para reforcar a ideia de sistema
- textos mais naturais, sem cara de texto automatico
- marca visual propria com logo aplicado em todas as paginas
- separacao clara entre a jornada do estudante e a operacao do recrutador
- assistente integrada ao site com evolucao progressiva: primeiro no front, depois com servidor local para IA real

## O que esse projeto mostra sobre voce

- voce pensa em fluxo, nao so em tela
- voce consegue estruturar um sistema pequeno com varias paginas
- voce tem cuidado com UX, texto e hierarquia
- voce sabe iterar e refinar interface
- voce consegue defender uma ideia de produto, nao apenas um layout

## Versao curta para falar em 1 minuto

Esse projeto se chama Conecta Estagio. Eu criei essa ideia pensando em estudantes que estao tentando entrar no mercado e normalmente encontram uma jornada muito confusa entre vagas, cadastro, empresa e processo seletivo. Em vez de fazer uma landing page simples, eu montei uma estrutura com home, vagas filtradas por area, cadastro enxuto, area do recrutador, perfis de estudantes, comunidade e apresentacao de empresas. O foco foi mostrar repertorio de front-end, identidade visual e pensamento de produto.

## Versao um pouco mais completa para entrevista

O Conecta Estagio nasceu da vontade de construir algo mais proximo da vida real de quem procura o primeiro estagio. Como estou no segundo periodo de ADS, comecei pela area tech, com foco em front-end, back-end, full stack, dados, suporte e produto digital. A estrutura separa bem os papeis: o estudante acessa vagas e comunidade, enquanto o recrutador entra em uma area propria para publicar vagas com link externo e acessar perfis. Tambem criei uma pagina de empresas para dar mais contexto, uma comunidade com participacao identificada de recrutadores e uma assistente com modo demo e modo real via servidor local. Visualmente, trabalhei com uma base escura, logo proprio, cards mais robustos e um tom mais humano.

## Expansao futura

Uma parte importante da ideia e que ela nao precisa ficar limitada a tecnologia. Se o conceito evoluir, eu imagino a plataforma abrindo espaco para areas como:

- Enfermagem
- Administracao
- Logistica
- Pedagogia
- Recursos Humanos
- Design

## Possiveis perguntas e respostas

### Por que voce escolheu esse tema?

Porque estagio e primeiro emprego sao dores muito proximas do meu momento e porque eu queria construir um case que tivesse relacao real com o publico que eu queria representar.

### Qual foi a principal preocupacao de UX?

Deixar a experiencia clara, reduzir excesso no cadastro do aluno e separar bem a parte publica da parte de operacao do recrutador.

### Por que a IA real usa servidor local?

Porque a OpenAI orienta a nao expor chave em codigo client-side. Entao eu deixei uma experiencia em camadas: no navegador ela ja funciona em modo demo, e quando eu quero demonstrar a versao real, rodo um servidor local com a chave protegida no ambiente.

### O que voce melhoraria com mais tempo?

Eu colocaria autenticacao, persistencia real de dados, pagina individual de vaga, perfil completo de estudante e expansao real para outras areas alem da tecnologia.

### O que torna esse projeto diferente de uma landing page comum?

Ele tenta simular um pequeno ecossistema de produto, com varias telas conectadas, fluxos separados e uma ideia de plataforma mais completa.
