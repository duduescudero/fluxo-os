# Arquitetura

O frontend React é uma SPA TypeScript com Vite, React Router e TanStack Query. Formulários usam React Hook Form, validação Zod no login e validação nativa nos cadastros, complementada pelas regras obrigatórias do servidor. A apresentação usa Tailwind e CSS próprio com variáveis de tema.

| Projeto | Responsabilidade |
| --- | --- |
| Domain | Entidades, orçamento, valores, transições e eventos. Sem dependência de HTTP, EF ou Identity. |
| Application | Contratos, projeções, casos de uso e escopo de acesso às ordens. Usa EF Core através de `IFlowDb`. |
| Infrastructure | Contexto PostgreSQL, mapeamentos, Identity, índices e migrações. |
| Api | Endpoints, composição, autenticação, CSRF, erros e carga fictícia opcional. |

## Dados

- Customer possui equipamentos e pode ser arquivado; não é removido por uma operação da interface.
- Equipment mantém o proprietário. Trocar o cliente para reescrever o histórico é proibido.
- ServiceOrder possui número sequencial do banco, técnico, estado e token de versão.
- Quote possui revisão única por ordem e mantém suas decisões.
- QuoteItem usa valor decimal com precisão definida e quantidade inteira.
- OrderEvent registra autor, descrição e instante.
- AppUser pertence ao Identity; os relacionamentos das ordens não são removidos com a desativação.

Os GUIDs de agregados e filhos são atribuídos pela aplicação e mapeados com `ValueGeneratedNever`. A inserção de um novo evento em uma ordem rastreada deve ser uma inserção, não uma tentativa de atualizar uma chave supostamente existente.

## Transações e concorrência

Uma chamada a `SaveChangesAsync` grava a ordem e os eventos em uma transação. A versão recebida pelo endpoint é comparada ao estado atual, e o token de concorrência também protege disputas entre leitura e gravação. A segunda escrita conflitante retorna HTTP 409.

Alterações de administradores usam transação serializável e trava de transação PostgreSQL para proteger o último administrador ativo. Isso é específico do banco adotado e está documentado como escolha de consistência.

## Execução

No Docker, o build Node gera os arquivos estáticos; o SDK .NET publica a API; a imagem final contém runtime e arquivos estáticos. O processo usa o usuário `app`. PostgreSQL e chaves de proteção têm volumes separados.

No desenvolvimento, Vite encaminha `/api` para `127.0.0.1:5080`. Na imagem final, tudo está na mesma origem.

## API

- `/api/auth/csrf`, `/login`, `/logout`, `/me`, `/demo` sob o grupo de autenticação.
- `/api/customers`, `/api/equipment`: consulta paginada e alterações administrativas.
- `/api/orders`: consultas filtradas, criação e detalhe.
- `/api/orders/{id}/actions/{action}`: atribuição, diagnóstico, observação, envio de orçamento e transição.
- `/api/orders/{id}/quotes`, `/decision`: versões e decisão registrada.
- `/api/dashboard`, `/api/team`, `/api/users`: indicadores e equipe.
- `/health/live`, `/health/ready`: processo e disponibilidade do banco.
- `/openapi/v1.json`: contrato JSON, habilitado no ambiente Development.

Os endpoints não expõem entidades EF diretamente. Erros de negócio usam Problem Details e identificador da requisição.
