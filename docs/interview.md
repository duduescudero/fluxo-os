# Apresentação em três minutos

1. **Problema:** uma assistência precisa acompanhar o atendimento e registrar decisões, sem pular etapas.
2. **Visão geral:** mostre indicadores calculados e os atendimentos em cada etapa.
3. **Um atendimento:** cliente e equipamento, diagnóstico, orçamento e linha do tempo.
4. **Regra importante:** tente iniciar reparo sem aprovação; explique por que a API também bloqueia.
5. **Conclusão:** registre reparo e entrega no ambiente editável. Mostre o evento com autor e data.
6. **Qualidade:** abra os testes de transição, a integração com PostgreSQL e o teste Playwright do fluxo completo.

## Perguntas para praticar

- Por que um monólito modular atende esse escopo?
- Por que usar decimal para preços?
- Como uma revisão de orçamento afeta uma aprovação?
- Qual a diferença entre autenticação, perfil e autorização de uma ordem específica?
- Como o controle de versão impede perda de informação?
- Por que gravar evento e ordem na mesma transação?
- O que cookie HttpOnly resolve e por que CSRF continua necessário?
- Por que testar usando o mesmo banco usado pela aplicação?
- Quais limitações existem no login de demonstração?
- O que precisaria mudar para hospedar para uma assistência real?

Explique o apoio de IA no desenvolvimento e apresente somente o que consegue demonstrar no código. Não atribua usuários reais ou resultados comerciais ao protótipo.
