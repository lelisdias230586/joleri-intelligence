# Riscos jurídicos e de produto

Este documento é um checklist técnico e não substitui advogado, contador, auditor ou autorização regulatória.

## Classificação do token

O contrato foi projetado como token de utilidade: ele permite contratar acesso a sinais e previsões fornecidos pela Joleri Intelligence. O nome técnico não define o tratamento jurídico. Forma de venda, promessas, marketing, direitos econômicos, uso dos recursos, atuação da equipe e expectativa do comprador podem alterar a classificação em cada país.

Evite:

- prometer valorização, preço mínimo, rendimento ou lucro;
- divulgar metas de preço ou multiplicadores;
- apresentar recompra como garantia econômica;
- vender o token antes de existir um produto utilizável;
- usar resultados selecionados para sugerir que a IA sempre vence;
- afirmar ou insinuar aprovação, parceria ou futura listagem pela Binance;
- oferecer o token onde a empresa não está autorizada.

## Sinais de trading

Previsões podem gerar perdas. A plataforma deve:

- explicar metodologia e limitações;
- mostrar histórico completo, incluindo erros e períodos negativos;
- separar backtest, paper trading e resultado real;
- informar custos, slippage e latência;
- impedir linguagem de garantia;
- avaliar se os sinais, automação ou gestão de API exigem autorização local;
- limitar permissões de API e nunca solicitar saque quando integrar corretoras.

## Oferta e distribuição

Antes de venda, a equipe deve obter análise por escrito sobre:

- jurisdição da empresa emissora;
- países onde publicidade e venda serão permitidas;
- valores mobiliários e contratos de investimento coletivo;
- regras de publicidade financeira e proteção do consumidor;
- KYC, AML, sanções e Travel Rule quando aplicáveis;
- tributação da emissão, tesouraria, mensalidades e usuários;
- tratamento contábil dos tokens e receitas;
- restrições a investidores e períodos de revenda;
- termos da distribuição inicial e conflitos de interesse.

## Privacidade e segurança

O backend associará carteiras a contas e poderá tratar dados financeiros. Defina base legal, finalidade, retenção, exclusão, segurança, fornecedores e resposta a incidentes. Não registre chaves privadas, seeds ou segredos de API no frontend ou em logs.

## Mercado secundário

A equipe não controla a admissão em corretoras. Criar um BEP-20 não cria um par de negociação na Binance. Toda liquidez deve ter origem divulgada, critérios documentados e proibição de:

- negociação consigo mesmo;
- contas coordenadas para produzir volume falso;
- ordens destinadas a enganar outros participantes;
- informação privilegiada sem controles;
- bots para elevar artificialmente o preço;
- divulgação enganosa sobre demanda ou parcerias.

## Documentos mínimos antes do lançamento

- parecer jurídico por jurisdição;
- white paper revisado juridicamente;
- termos de venda e uso;
- política de privacidade e cookies;
- aviso de risco de criptoativos e sinais;
- política de conflitos e negociação por pessoas relacionadas;
- política de tesouraria e liquidez;
- política de AML/sanções, se aplicável;
- relatório de auditoria dos contratos;
- divulgação de tokenomics, vesting e carteiras oficiais.
