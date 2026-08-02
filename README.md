# Joleri Intelligence (JOLR)

MVP técnico de um token de utilidade para acesso a sinais e previsões de trading com inteligência artificial.

> **Estado atual:** protótipo para desenvolvimento e testnet. Não foi implantado em mainnet, não possui liquidez, não está listado na Binance e não está autorizado para venda pública.

## O que está incluído

- `JoleriToken.sol`: BEP-20/ERC-20 de oferta fixa, sem função de emissão adicional e sem taxa de transferência.
- `JoleriAccess.sol`: assinatura que exige pagamento periódico e saldo mínimo de JOLR.
- `JoleriVestingWallet.sol`: vesting linear com cliff para equipe e parceiros.
- Módulo Hardhat Ignition com distribuição completa dos 100 milhões de JOLR.
- Testes de oferta, transferências, pausa, assinatura, saldo mínimo, timelock e vesting.
- Configuração para BNB Smart Chain Testnet e Mainnet.
- Documentação de tokenomics, implantação, segurança e riscos legais.
- Relatório reproduzível de validação técnica em `docs/VALIDATION.md`.

## Características do token

| Campo | Valor |
|---|---:|
| Nome | Joleri Intelligence |
| Símbolo | JOLR |
| Padrão | ERC-20 compatível com BEP-20 |
| Rede planejada | BNB Smart Chain |
| Decimais | 18 |
| Oferta inicial máxima | 100.000.000 JOLR |
| Emissão futura | Não existe |
| Taxa de compra/venda | Não existe |
| Permit | EIP-2612 |

## Planos iniciais de testnet

Os valores são referências técnicas e devem ser reavaliados antes de qualquer lançamento.

| Plano | Saldo mínimo | Mensalidade |
|---|---:|---:|
| Basic | 10.000 JOLR | 500 JOLR |
| Pro | 50.000 JOLR | 2.000 JOLR |
| Elite | 200.000 JOLR | 7.500 JOLR |

O usuário precisa conservar o saldo mínimo **depois** de pagar a mensalidade. A plataforma deve consultar `accessStatus(carteira)` a cada sessão ou solicitação protegida. Transferir tokens e ficar abaixo do limite suspende o acesso automaticamente; os tokens não são confiscados.

O limite de saldo é registrado no momento da compra e não muda durante o período já pago. Extensões usam os valores vigentes. A troca de plano fica bloqueada enquanto houver tempo ativo, evitando conversões indevidas entre mensalidades de níveis diferentes.

## Requisitos

- Node.js 22.13 ou superior.
- npm 10 ou superior.
- VS Code ou outro editor.
- BNB de teste somente quando chegar à etapa de implantação em testnet.

## Instalação no Windows

Abra o PowerShell na pasta do projeto:

```powershell
npm install
npm run check
npm run audit:prod
```

O comando `check` compila, valida o TypeScript e executa todos os testes.

## Implantação local

```powershell
npm run deploy:local
```

Por padrão, todas as carteiras de distribuição usam a conta local de implantação. Isso serve apenas para testes.

## Implantação na BNB Smart Chain Testnet

Leia primeiro [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Resumo:

1. Configure RPC e chave privada com o keystore do Hardhat.
2. Copie o arquivo de parâmetros de exemplo.
3. Substitua todos os endereços zero por carteiras válidas.
4. Execute novamente `npm run check`.
5. Implante somente na testnet e confira manualmente cada saldo e permissão.

Nunca inclua chaves privadas no código, no Git ou em arquivos enviados a terceiros.

## Estrutura

```text
contracts/
  JoleriAccess.sol
  JoleriToken.sol
  JoleriVestingWallet.sol
docs/
  DEPLOYMENT.md
  LEGAL_AND_RISK.md
  TOKENOMICS.md
  VALIDATION.md
ignition/
  modules/Joleri.ts
  parameters/bsc-testnet.example.json
test/
  JoleriAccess.ts
  JoleriToken.ts
  JoleriVestingWallet.ts
```

## Segurança administrativa

- O administrador padrão deve ser uma multisig, nunca uma carteira pessoal na mainnet.
- A troca do administrador exige duas etapas e espera de 48 horas.
- Alterações de planos e tesouraria também aguardam 48 horas.
- Alterações de planos valem para novas compras e extensões; não retiram termos já pagos.
- Existe pausa de emergência, mas não existe função de congelamento individual.
- O contrato de token não é atualizável e não possui `mint` público ou administrativo.
- O contrato de assinatura não guarda mensalidades: transfere diretamente para a tesouraria.

## Antes da mainnet

São obrigatórios, no mínimo:

- parecer jurídico nas jurisdições de oferta;
- auditoria independente dos contratos;
- multisig e política formal de signatários;
- testes econômicos da distribuição e dos níveis de acesso;
- política de privacidade, termos de uso e aviso de riscos dos sinais;
- plano de resposta a incidentes;
- produto de IA funcional e usuários reais;
- revisão de marca e domínios.

## Aviso

JOLR foi projetado como token de utilidade. O software não promete valorização, rendimento ou lucro. Sinais e previsões podem falhar e não constituem garantia de resultado. A existência de um token na BNB Smart Chain não implica listagem na Binance ou em qualquer outra corretora.

## Referências oficiais

- [Hardhat 3](https://hardhat.org/docs/getting-started)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/5.x/)
- [BNB Chain](https://docs.bnbchain.org/)
- [Processo de listagem da Binance](https://www.binance.com/en/support/announcement/detail/d378c2176ac841bb8eae68f63d4c4845)

## Licença

MIT. O uso em produção continua sujeito a auditoria, legislação aplicável e responsabilidade integral do operador.
