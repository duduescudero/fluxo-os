# Verificações executadas

Em 20/10/2026, no Windows com .NET 10, Node 24, Chrome e Docker Desktop:

| Verificação | Resultado |
| --- | --- |
| Regras de domínio | 76 casos aprovados, incluindo transições inválidas, orçamento e entrega. |
| API com PostgreSQL real isolado | 12 testes aprovados: autenticação, CSRF, permissões, fluxo completo, concorrência, campos inválidos e demonstração somente leitura. |
| Componentes React | 6 testes aprovados. |
| Navegador | 4 testes aprovados: atendimento completo, permissões do técnico, navegação mobile e checagem axe do login/dashboard. |
| Compilação | Backend Release e frontend aprovados; lint sem erros. |
| Docker | Imagem construída e aplicação iniciada com PostgreSQL persistente. |
| Interface na imagem Docker | Sem erros JavaScript; sem rolagem do documento em 390 px; sem violações detectadas pelo axe nas telas examinadas. |
| Publicação | Configurações locais, senhas, dependências e artefatos de execução ignorados pelo Git. |

As imagens do README foram capturadas no ambiente Docker com dados fictícios. Esses testes não certificam segurança, acessibilidade integral ou prontidão para uso comercial.
