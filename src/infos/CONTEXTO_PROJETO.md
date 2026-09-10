# ReadUp - Contexto Técnico do Projeto (Back-end)

Este documento serve como a "memória central" do projeto para orientar modelos de IA no desenvolvimento contínuo do back-end do **ReadUp**.

## 1. Visão Geral do Projeto
O **ReadUp** é um ecossistema de produtividade literária focado em rastrear hábitos de leitura e gerenciar bibliotecas virtuais. Originalmente desenvolvido com armazenamento local (SwiftData) no iOS, o projeto migrou para uma arquitetura **Cliente-Servidor**: o app iOS é hoje online-only, com este backend como única fonte de dados (a única exceção é uma fila local mínima no app para sessões de leitura que falharam ao enviar por falta de rede).

## 2. Stack Tecnológica
- **Linguagem:** TypeScript
- **Framework Web:** Express (Node.js)
- **Banco de Dados:** PostgreSQL, rodando em produção no Supabase (`DATABASE_URL` aponta direto pra lá — não há banco de staging separado)
- **ORM:** Prisma (`^6.19.3`, ver `package.json`)
- **Segurança:** Bcrypt (hashing de senhas), JWT (implementado — ver seção 4)
- **Infraestrutura:** Deploy na Vercel como função serverless (`server.ts` só chama `app.listen` fora do ambiente Vercel); Docker Compose permanece disponível para rodar Postgres localmente em desenvolvimento

## 3. Arquitetura e Organização
O projeto segue uma arquitetura em camadas para garantir separação de responsabilidades e escalabilidade:

- **`src/dtos/`**: Objetos de transferência de dados (interfaces para entrada e saída de dados).
- **`src/repositories/`**: Camada de persistência (interação direta com o Prisma/Banco de Dados).
- **`src/services/`**: Camada de lógica de negócio (validações, regras e processamento).
- **`src/controllers/`**: Camada de interface (recebe requisições HTTP e devolve respostas).
- **`src/routes/`**: Definição dos endpoints da API.
- **`src/middlewares/`**: Interceptadores de requisições (ex: validação de token JWT).
- **`src/database/`**: Configuração do Prisma Client.

## 4. Progresso Atual da Implementação
- [x] **Modelagem de Dados:** Tabelas `User`, `Book` e `ReadingSession` definidas e migradas via Prisma.
- [x] **Autenticação:** `AuthController`/`AuthService` com JWT, login por email/senha e "Sign in with Apple" (`apple-signin-auth`), `authMiddleware` protegendo as rotas sensíveis.
- [x] **Biblioteca Virtual (Books):** CRUD completo (`book.routes.ts`), vinculado ao `userId` do token; busca (`/books/search`) e lookup por ISBN (`/books/lookup`) são rotas públicas, para convidados e o scanner de código de barras.
- [x] **Sessões de Leitura (ReadingSessions):** `sessionRoutes` registra progresso de páginas e tempo de leitura; `CreateReadingSessionDTO` aceita opcionalmente uma `date` explícita, usada quando o app reenvia uma sessão que ficou na fila offline (`validateCreateSessionInput` valida `pagesRead`/`readingTimeSeconds`/`date` nesse caso).
- [x] **Deploy:** backend rodando em produção na Vercel, banco em produção no Supabase.
- [x] **Integração SwiftUI:** o app iOS não usa mais SwiftData para dados de conta/biblioteca — tudo vem deste backend.
- [x] **Busca de livros:** camada dedicada em `src/services/search/` (Open Library como fonte principal, Google Books como fallback), com testes (`node --test`).

## 5. Próximos Passos (Roadmap)
Sem roadmap formal no momento — o essencial descrito acima está em produção. Mudanças de escopo maior (novas entidades, novos fluxos) merecem sua própria seção aqui quando surgirem, em vez de reviver esta lista.

## 6. Instruções para a IA
Ao dar continuidade ao projeto:
- Respeite a separação de camadas.
- Sempre utilize DTOs para entrada e saída de dados nos Controllers.
- Garanta que a lógica de negócio pesada permaneça nos Services.
- Mantenha a tipagem estrita do TypeScript.
- Verifique o `schema.prisma` antes de sugerir mudanças no banco de dados.
