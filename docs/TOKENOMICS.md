# Tokenomics da Joleri Intelligence

## Princípios

1. O token deve possuir utilidade verificável dentro de um produto existente.
2. A oferta máxima é criada uma única vez e não pode ser aumentada.
3. Não existem taxas ocultas de compra, venda ou transferência.
4. A equipe e os parceiros não recebem toda a alocação imediatamente.
5. Nenhum mecanismo promete preço, recompra ou valorização.
6. Mudanças que afetem o acesso devem ser anunciadas e respeitar o atraso on-chain.

## Oferta e distribuição inicial

Oferta máxima: **100.000.000 JOLR**.

| Destinação | Percentual | Quantidade | Regra inicial |
|---|---:|---:|---|
| Ecossistema e adoção do produto | 35% | 35.000.000 | Carteira operacional/multisig |
| Tesouraria e desenvolvimento | 20% | 20.000.000 | Multisig com política pública |
| Liquidez e distribuição futura | 15% | 15.000.000 | Não utilizar antes do plano jurídico e econômico |
| Equipe fundadora | 15% | 15.000.000 | 36 meses, cliff de 12 meses |
| Parceiros estratégicos | 10% | 10.000.000 | 24 meses, cliff de 180 dias |
| Segurança, auditoria e jurídico | 5% | 5.000.000 | Multisig dedicada |
| **Total** | **100%** | **100.000.000** | |

O módulo de implantação transfere as alocações da equipe e dos parceiros diretamente para contratos de vesting. As demais carteiras devem ser endereços separados e, em produção, controladas por multisig.

## Utilidade

JOLR habilita acesso aos produtos da Joleri Intelligence. O MVP implementa três níveis:

| Plano | Saldo mínimo | Pagamento por 30 dias |
|---|---:|---:|
| Basic | 10.000 JOLR | 500 JOLR |
| Pro | 50.000 JOLR | 2.000 JOLR |
| Elite | 200.000 JOLR | 7.500 JOLR |

Fluxo:

1. O usuário compra ou recebe JOLR em um mercado independente.
2. Conecta a carteira à plataforma e aprova somente o valor da mensalidade.
3. Compra a assinatura on-chain.
4. O contrato transfere a mensalidade diretamente à tesouraria.
5. A API consulta assinatura e saldo antes de entregar sinais protegidos.
6. Se o saldo cair abaixo do mínimo, o acesso fica inativo até o saldo ser recomposto.

## Alteração dos planos

Uma conta com `CONFIG_ROLE` pode agendar novos limites e mensalidades. A alteração só pode ser executada após 48 horas e fica registrada em eventos públicos. Desabilitar um plano impede novas compras, mas não cancela assinaturas já pagas.

Cada compra registra o limite de saldo vigente. Uma mudança posterior só vale para novas compras e extensões. O usuário não pode trocar de nível enquanto ainda houver tempo pago; isso evita transformar meses adquiridos em um plano barato em acesso retroativo a um plano superior.

Antes da mainnet, a governança deve definir:

- prazo mínimo de aviso fora da blockchain;
- metodologia para ajustar mensalidades;
- procedimento de contestação e reembolso fora da blockchain;
- limites de variação por atualização;
- responsáveis e quórum da multisig.

## Liquidez e negociação

O preço não é controlado pelo contrato. Qualquer mercado deve funcionar com negociação legítima e divulgação transparente. O projeto não deve realizar wash trading, volume artificial, pump coordenado, promessa de preço, compra oculta com recursos de clientes ou comunicação que transforme a utilidade em garantia de investimento.

O contrato não implementa recompra nem queima automática de receitas. Uma eventual proposta futura exigirá análise jurídica, votação formal, divulgação prévia e nova auditoria.

## Métricas que devem orientar o projeto

- assinantes ativos e retenção;
- número de carteiras que usam efetivamente o produto;
- receita de assinaturas, separada de venda de tokens;
- precisão dos sinais com metodologia pública e sem selecionar apenas resultados positivos;
- disponibilidade e segurança da plataforma;
- concentração de tokens por carteira;
- cronograma de desbloqueios e liquidez real.
