# Relatório de validação do MVP

Data da validação: **31 de julho de 2026**.

## Ambiente validado

| Componente | Versão |
|---|---:|
| Node.js | 24.14.0 |
| Hardhat | 3.12.0 |
| Solidity (`solc-js`) | 0.8.28 |
| OpenZeppelin Contracts | 5.6.1 |
| Viem | 2.55.10 |

O compilador está fixado no projeto e o alvo EVM é `cancun`, compatível com a configuração atual da BNB Smart Chain.

## Verificações concluídas

| Verificação | Resultado |
|---|---|
| Compilação padrão | Aprovada |
| Compilação com perfil `production` e otimizador | Aprovada |
| Validação TypeScript | Aprovada |
| Testes automatizados | 25 aprovados, 0 falhas |
| Cobertura de `JoleriToken` e `JoleriAccess` | 100% de linhas e statements |
| Teste de vesting | Cliff, liberação linear e liberação final aprovados |
| Implantação local completa com Ignition | Aprovada |
| Auditoria npm de dependências de produção | 0 vulnerabilidades conhecidas |
| Gate npm para severidade alta | Aprovado |

`JoleriVestingWallet` é um adaptador mínimo das implementações auditadas do OpenZeppelin e foi excluído da instrumentação de cobertura, mas possui teste funcional ponta a ponta.

## Limitações conhecidas

- Este relatório não é uma auditoria independente de smart contracts.
- Slither, fuzzing contínuo e análise formal não foram executados neste ambiente.
- O `npm audit` completo informa avisos transitivos de baixa severidade na cadeia de desenvolvimento do verificador Hardhat/Ethers v5, sem correção upstream disponível na data acima. Esses pacotes não integram o bytecode implantado; devem continuar sendo monitorados e atualizados.
- Nenhuma implantação em testnet ou mainnet foi realizada por esta validação.
- Testes não validam modelo de negócio, classificação jurídica, segurança do backend, qualidade dos sinais de IA ou liquidez de mercado.

## Revalidação obrigatória

Execute novamente antes de cada release:

```powershell
npm ci
npm run check
npm run coverage
npm run audit:prod
npx hardhat compile --build-profile production
npm run deploy:local
```

Antes da mainnet, acrescente auditoria externa, análise estática, fuzzing, teste em fork, revisão de permissões da multisig e parecer jurídico.
