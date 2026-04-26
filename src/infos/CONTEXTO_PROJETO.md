# ReadUp - Contexto Técnico do Projeto (Back-end)

Este documento serve como a "memória central" do projeto para orientar modelos de IA no desenvolvimento contínuo do back-end do **ReadUp**.

## 1. Visão Geral do Projeto
O **ReadUp** é um ecossistema de produtividade literária focado em rastrear hábitos de leitura e gerenciar bibliotecas virtuais. Originalmente desenvolvido com armazenamento local (SwiftData) no iOS, o projeto está sendo evoluído para uma arquitetura **Cliente-Servidor**.

## 2. Stack Tecnológica
- **Linguagem:** TypeScript
- **Framework Web:** Express (Node.js)
- **Banco de Dados:** PostgreSQL (atualmente rodando em Docker, com planos para migração para o Supabase)
- **ORM:** Prisma (v7.x)
- **Segurança:** Bcrypt (hashing de senhas), JWT (planejado para autenticação)
- **Infraestrutura:** Docker & Docker Compose (ambiente de desenvolvimento)

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
- [x] **Setup do Ambiente:** Docker configurado com PostgreSQL e TypeScript configurado com as devidas restrições de compilador.
- [x] **Camada de Cadastro de Usuário:**
    - Criados DTOs para criação e resposta de usuário.
    - `UserRepository` implementado com busca por email/AppleID e criação.
    - `UserService` implementado com validação de duplicidade e criptografia de senha via Bcrypt.
- [x] **Suporte a Login Social:** Estrutura pronta para suportar "Sign in with Apple" junto ao login manual.

## 5. Próximos Passos (Roadmap)
1. **Autenticação:**
    - Implementar `LoginController` e `AuthService`.
    - Gerar tokens **JWT** após o login.
    - Criar `AuthMiddleware` para proteger rotas sensíveis.
2. **Biblioteca Virtual (Books):**
    - Criar CRUD para gerenciar livros (incluindo status de leitura).
    - Vincular livros ao `userId` extraído do token JWT.
3. **Sessões Literárias (ReadingSessions):**
    - Implementar lógica para registrar progresso de páginas e tempo de leitura.
4. **Deploy:**
    - Configurar banco de dados no Supabase.
    - Realizar o deploy do backend para consumo em nuvem.
5. **Integração SwiftUI:**
    - No app iOS, substituir a persistência do SwiftData por chamadas de rede para este backend.

## 6. Instruções para a IA
Ao dar continuidade ao projeto:
- Respeite a separação de camadas.
- Sempre utilize DTOs para entrada e saída de dados nos Controllers.
- Garanta que a lógica de negócio pesada permaneça nos Services.
- Mantenha a tipagem estrita do TypeScript.
- Verifique o `schema.prisma` antes de sugerir mudanças no banco de dados.
