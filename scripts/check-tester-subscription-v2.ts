import { network } from "hardhat";
import {
  decodeFunctionData,
  formatEther,
  formatUnits,
  getAddress,
  parseAbi,
  parseEventLogs,
  type Address,
} from "viem";

const TOKEN = getAddress(
  "0xFE67d22F3540B4368340e2043B404bB7205eC441",
);

const ACCESS = getAddress(
  "0x8148Eb91811296DaE1c01008cdf54bEA18e45DDe",
);

const TESTER = getAddress(
  "0x1D34F5b9FAfcCb22bc0Bca4D3dC0d42b309a0eE4",
);

const TREASURY = getAddress(
  "0x8EbB2BD841f85474F8Dc430B810F0C8a0D950D71",
);

const SUBSCRIPTION_TX =
  "0xe8dbf60d3997f817ad344893959d69b8313362261b031d807db1c0a5a0fcd021";

const BASIC_PLAN_ID = 1;
const PURCHASE_MONTHS = 1;
const DECIMALS = 18;
const TOKEN_UNIT = 10n ** 18n;
const BASIC_MINIMUM = 10_000n * TOKEN_UNIT;
const BASIC_FEE = 500n * TOKEN_UNIT;
const EXPECTED_TESTER_BALANCE = 10_000n * TOKEN_UNIT;
const EXPECTED_TREASURY_BALANCE = 20_000_500n * TOKEN_UNIT;
const BILLING_PERIOD = 30n * 24n * 60n * 60n;

const tokenAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

const accessAbi = parseAbi([
  "function subscribe(uint8 planId, uint16 monthsCount)",
  "function accessStatus(address subscriber) view returns (bool active, uint8 planId, uint64 expiresAt, uint256 minimumBalance, uint256 currentBalance)",
  "event SubscriptionPurchased(address indexed subscriber, uint8 indexed planId, uint16 monthsCount, uint256 feePaid, uint64 expiresAt)",
]);

function sameAddress(
  left: Address | null | undefined,
  right: Address,
): boolean {
  return left?.toLowerCase() === right.toLowerCase();
}

function formatJolr(value: bigint): string {
  return `${formatUnits(value, DECIMALS)} JOLR`;
}

function formatTimestamp(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toISOString();
}

const { viem, networkName } = await network.create("bscTestnet");
const client = await viem.getPublicClient();

const chainId = await client.getChainId();

const [transaction, receipt] = await Promise.all([
  client.getTransaction({ hash: SUBSCRIPTION_TX }),
  client.getTransactionReceipt({ hash: SUBSCRIPTION_TX }),
]);

const block = await client.getBlock({
  blockNumber: receipt.blockNumber,
});

const decodedCall = decodeFunctionData({
  abi: accessAbi,
  data: transaction.input,
});

const transferEvents = parseEventLogs({
  abi: tokenAbi,
  logs: receipt.logs,
  eventName: "Transfer",
  strict: false,
});

const subscriptionEvents = parseEventLogs({
  abi: accessAbi,
  logs: receipt.logs,
  eventName: "SubscriptionPurchased",
  strict: false,
});

const paymentTransfer = transferEvents.find(
  (event) =>
    sameAddress(event.address, TOKEN) &&
    sameAddress(event.args.from, TESTER) &&
    sameAddress(event.args.to, TREASURY) &&
    event.args.value === BASIC_FEE,
);

const purchaseEvent = subscriptionEvents.find(
  (event) =>
    sameAddress(event.address, ACCESS) &&
    sameAddress(event.args.subscriber, TESTER) &&
    event.args.planId === BASIC_PLAN_ID &&
    event.args.monthsCount === PURCHASE_MONTHS &&
    event.args.feePaid === BASIC_FEE,
);

const [
  testerNativeBalance,
  testerTokenBalance,
  remainingAllowance,
  treasuryTokenBalance,
  accessTokenBalance,
  accessStatus,
] = await Promise.all([
  client.getBalance({ address: TESTER }),
  client.readContract({
    address: TOKEN,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [TESTER],
  }),
  client.readContract({
    address: TOKEN,
    abi: tokenAbi,
    functionName: "allowance",
    args: [TESTER, ACCESS],
  }),
  client.readContract({
    address: TOKEN,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [TREASURY],
  }),
  client.readContract({
    address: TOKEN,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [ACCESS],
  }),
  client.readContract({
    address: ACCESS,
    abi: accessAbi,
    functionName: "accessStatus",
    args: [TESTER],
  }),
]);

const [active, planId, expiresAt, minimumBalance, currentBalance] =
  accessStatus;

const decodedPlanId = decodedCall.args?.[0];
const decodedMonths = decodedCall.args?.[1];
const expectedExpiration = block.timestamp + BILLING_PERIOD;

const checks = [
  ["Rede e Chain ID corretos", networkName === "bscTestnet" && chainId === 97],
  ["Transacao confirmada", receipt.status === "success"],
  ["Remetente e a Joleri Tester", sameAddress(transaction.from, TESTER)],
  ["Destino e o Joleri Access V2", sameAddress(transaction.to, ACCESS)],
  [
    "Chamada e subscribe(1, 1)",
    decodedCall.functionName === "subscribe" &&
      decodedPlanId === BASIC_PLAN_ID &&
      decodedMonths === PURCHASE_MONTHS,
  ],
  ["Transferencia de 500 JOLR para Treasury", paymentTransfer !== undefined],
  ["Evento SubscriptionPurchased correto", purchaseEvent !== undefined],
  ["Acesso ativo", active],
  ["Plano Basic ativo", planId === BASIC_PLAN_ID],
  ["Saldo minimo contratado correto", minimumBalance === BASIC_MINIMUM],
  ["Saldo atual informado correto", currentBalance === testerTokenBalance],
  ["Tester reteve 10000 JOLR", testerTokenBalance === EXPECTED_TESTER_BALANCE],
  ["Aprovacao foi totalmente consumida", remainingAllowance === 0n],
  [
    "Treasury recebeu a primeira mensalidade",
    treasuryTokenBalance === EXPECTED_TREASURY_BALANCE,
  ],
  ["Access nao reteve JOLR", accessTokenBalance === 0n],
  ["Validade e exatamente 30 dias", expiresAt === expectedExpiration],
  [
    "Evento e estado possuem a mesma validade",
    purchaseEvent?.args.expiresAt === expiresAt,
  ],
  ["Tester ainda possui gas", testerNativeBalance > 0n],
];

console.log("JOLERI INTELLIGENCE - VALIDACAO POS-ASSINATURA V2");
console.log(`Rede: ${networkName}`);
console.log(`Chain ID: ${chainId}`);
console.log(`Hash: ${SUBSCRIPTION_TX}`);
console.log(`Bloco: ${receipt.blockNumber}`);
console.log(`Timestamp do bloco: ${formatTimestamp(block.timestamp)}`);

console.log("\nTransacao:");
console.log(`Status: ${receipt.status}`);
console.log(`De: ${transaction.from}`);
console.log(`Para: ${transaction.to}`);
console.log(`Funcao: ${decodedCall.functionName}`);
console.log(`Plano: ${String(decodedPlanId)}`);
console.log(`Meses: ${String(decodedMonths)}`);

console.log("\nEstado pos-assinatura:");
console.log(`Tester tBNB: ${formatEther(testerNativeBalance)} tBNB`);
console.log(`Tester JOLR: ${formatJolr(testerTokenBalance)}`);
console.log(`Allowance restante: ${formatJolr(remainingAllowance)}`);
console.log(`Treasury JOLR: ${formatJolr(treasuryTokenBalance)}`);
console.log(`Access JOLR: ${formatJolr(accessTokenBalance)}`);
console.log(`Acesso ativo: ${active}`);
console.log(`Plano atual: ${planId}`);
console.log(`Saldo minimo contratado: ${formatJolr(minimumBalance)}`);
console.log(`Validade: ${formatTimestamp(expiresAt)}`);

console.log("\nVerificacoes:");

for (const [label, passed] of checks) {
  console.log(`${passed ? "OK" : "FALHA"} - ${label}`);
}

const approved = checks.every(([, passed]) => passed);

console.log("\nResultado final:");
console.log(
  approved
    ? "VALIDACAO POS-ASSINATURA V2 APROVADA"
    : "VALIDACAO POS-ASSINATURA V2 REPROVADA",
);

if (!approved) {
  process.exitCode = 1;
}
