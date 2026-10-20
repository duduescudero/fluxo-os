# Execução e operação

## Local

Execute `scripts/start.ps1` no Windows ou `sh scripts/start.sh` no Linux/macOS. `.env` é criado apenas quando não existe; as senhas locais são aleatórias. Não publique esse arquivo. O script Windows encontra instalações do Docker por usuário ou em Program Files.

`-ReadOnly` no script Windows habilita o modo de demonstração. Sem a opção, usa o modo editável. O banco e as chaves são preservados. Contas fictícias criadas sem senha no modo somente leitura recebem a senha inicial ao iniciar posteriormente o modo editável.

Para parar: `docker compose stop`. Para retomar: execute o script novamente. Não é necessário remover o volume quando alterar código.

## Variáveis

| Nome | Uso |
| --- | --- |
| ConnectionStrings__Database | Conexão PostgreSQL da API. |
| DATABASE_URL | Alternativa em URL PostgreSQL, com verificação TLS obrigatória. ConnectionStrings__Database tem prioridade. |
| Database__Migrate | Aplica migrações na inicialização quando explicitamente true. |
| Database__Seed | Cria acessos e dados fictícios opcionais; não habilitar para uma base real. |
| Bootstrap__Password | Senha inicial dos usuários locais, somente na criação/configuração inicial. |
| Demo__Enabled | Login de demonstração e bloqueio das alterações de negócio. Apenas com base fictícia. |
| DataProtection__Path | Diretório persistente das chaves usadas na autenticação. Se vazio, usa a tabela DataProtectionKeys no PostgreSQL. |
| ASPNETCORE_ENVIRONMENT | Development no Compose local; Production em uma implantação pública. |

Em produção, mantenha segredos fora da imagem, habilite HTTPS no proxy, restrinja acesso ao banco e aos volumes e desligue seed e demonstração para dados reais. Os cookies são Secure no ambiente Production. Não configure uma hospedagem pública apenas expondo a porta do Compose de desenvolvimento.

Para a demonstração com dados fictícios no Render e Neon, veja [publicação](deployment.md). A conexão direta escolhida permite executar as migrações no startup; o pool Npgsql desta única instância é limitado a dez conexões. Em uma implantação maior, separe as migrações em conexão direta do tráfego comum em conexão pooled.

## Segurança e limites

Cookie HttpOnly e SameSite Strict; CSRF em alterações, inclusive autenticação; limitação de tentativas de login; lockout do Identity; validação de sessão; restrição de recursos por técnico; CSP e proteção contra enquadramento. Esses mecanismos não equivalem a uma auditoria independente.

As chaves persistentes precisam de permissões e proteção apropriadas no host. O volume Docker permite sobreviver a reinícios, mas não é um serviço de gestão de segredos. Não exponha logs, `.env`, cookies ou dumps.

## Migrações e recuperação

Para uma atualização real, faça backup com `pg_dump` antes de aplicar migrações. Restaure em uma base separada com `pg_restore` e valide o resultado antes de qualquer substituição. Nunca use remoção de volumes como procedimento de atualização.

Migrações são versionadas em Infrastructure. Ambientes com várias instâncias devem executá-las como uma etapa controlada de implantação, em vez de cada réplica tentar migrar no startup.

## Desenvolvimento fora do container

Requer .NET 10, Node 24 e PostgreSQL. Configure as variáveis acima, use `ASPNETCORE_URLS=http://127.0.0.1:5080` e execute `dotnet run --project src/FluxoOS.Api`. Em `web`, use `npm ci` e `npm run dev`. O Vite faz proxy da API; não é necessário liberar CORS para qualquer origem.
