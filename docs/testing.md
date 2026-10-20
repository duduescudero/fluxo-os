# Validação

## Backend

`dotnet test FluxoOS.sln` executa testes de domínio e integração. Docker deve estar disponível para o Testcontainers criar seu PostgreSQL isolado. Ele não usa o banco do Compose da aplicação.

Cobertura funcional: transições válidas e inválidas, orçamento, dinheiro, expiração, revisão, entrega, cancelamento, sessão, CSRF, autorização por recurso, concorrência em dois contextos EF e persistência do histórico.

`FLOW_TEST_DATABASE` é uma alternativa avançada para fornecer uma base PostgreSQL descartável própria. Nunca aponte essa variável para dados reais: os testes escrevem dados fictícios.

## Frontend

Em `web`: `npm ci`, `npm test`, `npm run lint` e `npm run build`.

Os testes de componentes verificam apresentação de status, erro, vazio, paginação e formatação. TypeScript em modo estrito e ESLint complementam a verificação.

## Navegador

Com a aplicação editável em execução, instale o navegador de testes com `npx playwright install chromium` e defina:

- `FLOW_BASE_URL`: endereço da aplicação, por exemplo `http://127.0.0.1:8080`.
- `FLOW_E2E_PASSWORD`: senha local gerada em `.env`.

Execute `npm run test:e2e` em `web`. Opcionalmente, `PW_CHANNEL=chrome` permite utilizar Chrome instalado no computador.

O fluxo principal cadastra cliente e equipamento pela interface, abre a ordem, registra diagnóstico e orçamento, aprova, repara, entrega e consulta o histórico. Outros testes verificam restrições do técnico e navegação mobile. Os dados criados têm identificadores fictícios por execução.

## Verificação visual

As capturas do README são da aplicação real com dados fictícios. Foram verificadas larguras desktop e mobile, carregamento, ausência de erros JavaScript e contraste com axe. Verificações automatizadas de acessibilidade têm alcance limitado e não certificam conformidade completa.

O workflow no GitHub executa backend com PostgreSQL, frontend e testes do navegador sobre a imagem Docker. Nenhuma credencial de produção é necessária.
