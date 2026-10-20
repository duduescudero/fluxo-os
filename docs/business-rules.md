# Regras e permissões

| Origem | Destino / operação | Condição | Quem |
| --- | --- | --- | --- |
| Recebida | Em diagnóstico | Técnico ativo atribuído | Administrador ou técnico responsável |
| Em diagnóstico | Registrar diagnóstico | Texto válido | Administrador ou responsável |
| Em diagnóstico | Criar orçamento | Diagnóstico e itens válidos | Administrador ou responsável |
| Em diagnóstico | Aguardando aprovação | Versão em rascunho e dentro da validade | Administrador ou responsável |
| Aguardando aprovação | Aprovada | Canal, registro e data válidos; orçamento vigente | Administrador |
| Aguardando aprovação | Orçamento recusado | Decisão registrada | Administrador |
| Aprovada | Em manutenção | Versão atual aprovada | Administrador ou responsável |
| Em manutenção | Pronta para retirada | Descrição do serviço realizado | Administrador ou responsável |
| Pronta / Recusada | Entregue | Nome de quem retirou | Administrador |
| Não encerrada | Cancelada | Justificativa | Administrador |
| Diagnóstico / Aguardando / Aprovada / Recusada | Nova versão de orçamento; volta ao diagnóstico | Nova revisão, preservando a anterior | Administrador ou responsável |
| Qualquer estado | Observação interna | Texto e autor; não reabre nem altera etapa | Administrador ou responsável |

Entregue e Cancelada não admitem reabertura, atribuição, alteração de diagnóstico ou orçamento. Correções ficam como observações adicionais.

O técnico só lê ordens e dados associados aos seus atendimentos. Um identificador de ordem de outro técnico retorna 404. Cadastros, usuários, decisões de orçamento e entrega exigem administrador.

## Dinheiro

Itens têm quantidade inteira de 1 a 1.000 e valor de 0 a R$ 100.000, com até duas casas decimais. Um orçamento tem entre 1 e 30 itens, total positivo e máximo de R$ 1.000.000. Os limites são decisões do protótipo, não regras legais ou tributárias.

O backend recalcula o total com `decimal` e arredondamento explícito. Não aceita o total como verdade vinda do navegador. A prévia do frontend serve apenas para orientar o preenchimento.

## Decisão

A aprovação/recusa é registrada pelo administrador com data, canal e observação. O sistema não prova a identidade do cliente nem substitui assinatura. A data deve estar entre a abertura e o momento atual, com tolerância de um minuto para diferença de relógio.
