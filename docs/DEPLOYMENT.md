# Implantação segura

Este documento cobre o MVP e a BNB Smart Chain Testnet. Não use estas instruções para lançar em mainnet sem auditoria independente e parecer jurídico.

## 1. Preparar o ambiente no Windows

Instale Node.js 22.13 ou superior. Abra o PowerShell na pasta do projeto:

```powershell
npm install
npm run check
```

Não continue se qualquer teste falhar.

## 2. Preparar as carteiras

Separe endereços para:

- administrador da plataforma;
- ecossistema;
- tesouraria;
- liquidez;
- beneficiário da equipe;
- beneficiário dos parceiros;
- segurança, auditoria e jurídico.

Na testnet, podem ser carteiras de teste. Antes da mainnet, administrador, tesouraria, ecossistema, liquidez e segurança devem ser multisigs com signatários independentes.

## 3. Configurar segredos

Use o keystore do Hardhat:

```powershell
npx hardhat keystore set BSC_TESTNET_RPC_URL
npx hardhat keystore set BSC_TESTNET_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY
```

- A chave privada deve pertencer somente à carteira de implantação de testnet.
- Nunca use a seed phrase ou chave de uma carteira com patrimônio real.
- Não coloque chaves em `.env`, capturas de tela, chats ou repositórios.

## 4. Criar os parâmetros de testnet

```powershell
Copy-Item ignition\parameters\bsc-testnet.example.json ignition\parameters\bsc-testnet.json
```

Edite `ignition\parameters\bsc-testnet.json` e substitua **todos** os endereços zero. O exemplo usa endereços zero intencionalmente para impedir uma implantação acidental.

## 5. Simular localmente

```powershell
npm run deploy:local
```

Confirme que o Hardhat retorna quatro contratos:

- `JoleriToken`;
- `JoleriAccess`;
- `JoleriTeamVesting`;
- `JoleriPartnersVesting`.

## 6. Implantar na BSC Testnet

Obtenha BNB de teste somente em um faucet indicado pela documentação oficial da BNB Chain. Em seguida:

```powershell
npm run deploy:bsc-testnet
```

O parâmetro `--verify` publica o código-fonte nos verificadores configurados. Se a verificação falhar por atraso de indexação, aguarde e repita a verificação conforme a documentação do Hardhat.

## 7. Validação pós-implantação

Verifique no explorador:

- nome `Joleri Intelligence` e símbolo `JOLR`;
- oferta total de 100.000.000 JOLR;
- ausência de função `mint`;
- endereços e quantidades das seis alocações;
- 15.000.000 JOLR na carteira de vesting da equipe;
- 10.000.000 JOLR na carteira de vesting dos parceiros;
- proprietário, início, cliff e término de cada vesting;
- administrador e funções `CONFIG_ROLE` e `PAUSER_ROLE`;
- endereço correto da tesouraria no contrato de acesso;
- valores dos três planos;
- código verificado de todos os contratos.

Faça uma assinatura real de testnet com uma carteira separada e confirme:

1. aprovação limitada à mensalidade;
2. transferência da mensalidade à tesouraria;
3. ativação de `hasAccess`;
4. perda do acesso ao transferir tokens abaixo do mínimo;
5. recuperação do acesso após recompor o saldo;
6. expiração depois do período contratado.

## 8. Controles antes da mainnet

Não implante em mainnet enquanto faltar qualquer item:

- [ ] auditoria independente e correção integral dos achados críticos/altos;
- [ ] análise jurídica da emissão, venda, marketing e utilidade;
- [ ] empresa, contratos, contabilidade e responsáveis identificados;
- [ ] produto de IA funcional com metodologia de performance honesta;
- [ ] multisigs configuradas e testadas;
- [ ] política de gerenciamento de chaves e sucessão de signatários;
- [ ] termos de uso, privacidade e aviso de risco;
- [ ] plano de incidentes e canal público de segurança;
- [ ] tokenomics validada por cenários de preço e liquidez;
- [ ] revisão final de nomes, marca e domínios;
- [ ] decisão formal sobre jurisdições permitidas e bloqueadas;
- [ ] proibição operacional de wash trading e manipulação de mercado.

## 9. Implantação em mainnet

A configuração possui uma rede `bscMainnet`, mas não existe script npm de implantação em mainnet. Essa barreira é intencional. O comando deve ser preparado apenas depois que o checklist anterior estiver integralmente concluído e assinado pelos responsáveis jurídico, técnico e de segurança.
