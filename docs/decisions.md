# Decisões técnicas

1. **Monólito modular:** um domínio e uma implantação simples atendem o escopo. Microsserviços acrescentariam operação sem uma necessidade atual.
2. **PostgreSQL real nos testes de integração:** exercita relacionamentos, concorrência, decimal e comportamento do provedor usado no produto.
3. **Identity com cookie e CSRF:** evita criar um mecanismo próprio de senhas e armazenar tokens no navegador. Mesma origem reduz a configuração de CORS.
4. **Orçamentos versionados:** uma revisão não reescreve a decisão anterior; o reparo depende da versão atual aprovada.
5. **Concorrência otimista:** alterações simultâneas recebem conflito, em vez de uma escrita apagar a outra sem aviso.
6. **Histórico na transação:** não existe confirmação do atendimento sem a gravação correspondente dos eventos.
7. **EF na aplicação por interface:** escolha pragmática. Não se afirma independência completa do ORM nessa camada.
8. **Demonstração somente leitura:** permite explorar dados e permissões sem disponibilizar escrita administrativa anônima. O fluxo completo roda localmente.
9. **Ações explícitas no quadro:** arrastar cartões fica para uma evolução; as transições atuais têm mensagens e validação claras.
10. **CSS próprio sobre uma base utilitária:** mantém identidade visual consistente sem introduzir um grande conjunto de componentes que não seria utilizado.
