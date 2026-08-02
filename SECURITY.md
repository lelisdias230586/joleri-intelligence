# Política de segurança

## Estado do projeto

Este repositório é um MVP de testnet. Ausência de falhas nos testes não equivale a auditoria. Não utilize os contratos para custodiar valor real antes de uma revisão independente.

## Controles implementados

- oferta fixa sem função de emissão adicional;
- biblioteca OpenZeppelin com versão fixada;
- pausa de emergência separada para token e assinaturas;
- administração em duas etapas com espera de 48 horas;
- atraso de 48 horas para planos e tesouraria;
- proteção contra reentrância na assinatura;
- transferências com `SafeERC20`;
- pagamentos enviados diretamente à tesouraria;
- saldo mínimo registrado por assinatura para preservar o período já pago;
- troca de nível bloqueada enquanto uma assinatura estiver ativa;
- vesting on-chain para equipe e parceiros;
- eventos para alterações administrativas;
- testes de permissões, delays e invariantes principais.

## Responsabilidades de produção

Antes da mainnet:

1. contratar auditoria externa;
2. executar análise estática e fuzzing adicionais;
3. usar multisig com signatários independentes;
4. documentar procedimento de pausa e retomada;
5. monitorar eventos de papéis, planos, tesouraria e pausas;
6. publicar endereços oficiais por múltiplos canais;
7. definir um canal público de reporte de vulnerabilidades;
8. realizar um exercício de resposta a incidentes.

## Segredos

Nunca envie seeds, chaves privadas, códigos 2FA ou chaves de API com permissão de saque. Use o keystore do Hardhat e uma carteira exclusiva para implantação. A conta de implantação não deve continuar como administradora definitiva.

## Resposta a incidente

Em suspeita de falha:

1. pausar apenas o componente afetado;
2. preservar logs e hashes de transações;
3. convocar os signatários da multisig;
4. comunicar fatos confirmados sem minimizar o risco;
5. contratar revisão independente;
6. testar a correção em fork e testnet;
7. publicar relatório pós-incidente.
