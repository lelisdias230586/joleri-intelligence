import { readFileSync } from "node:fs";
import { network } from "hardhat";
import {
  formatUnits,
  getAddress,
  parseAbi,
  type Address,
} from "viem";

const TOKEN = getAddress(
  "0xFE67d22F3540B4368340e2043B404bB7205eC441",
);

const ACCESS = getAddress(
  "0x8148Eb91811296DaE1c01008cdf54bEA18e45DDe",
);

const EXPECTED_DEPLOYER = getAddress(
  "0x855e50dde2196ac5b3fa51d22e3673569c6e5f10",
);

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const accessAbi = parseAbi([
  "function jolr() view returns (address)",
  "function treasury() view returns (address)",
  "function pendingTreasury() view returns (address)",
  "function pendingTreasuryExecutableAt() view returns (uint48)",
  "function BASIC_PLAN() view returns (uint8)",
  "function PRO_PLAN() view returns (uint8)",
  "function ELITE_PLAN() view returns (uint8)",
  "function MAX_MONTHS_PER_PURCHASE() view returns (uint16)",
  "function CONFIG_DELAY() view returns (uint48)",
  "function BILLING_PERIOD() view returns (uint64)",
  "function getPlan(uint8 planId) view returns ((uint128 minimumBalance, uint128 monthlyFee, bool enabled))",
  "function hasAccess(address subscriber) view returns (bool)",
  "function paused() view returns (bool)",
]);

const tokenAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
]);

type JoleriParameters = {
  admin: Address;
  treasuryWallet: Address;
};

type PlanExpectation = {
  label: string;
  id: number;
  minimumTokens: bigint;
  monthlyTokens: bigint;
};

const parameterFile = JSON.parse(
  readFileSync(
    "ignition/parameters/bsc-testnet.json",
    "utf8",
  ),
) as {
  JoleriModule: JoleriParameters;
};

const parameters = parameterFile.JoleriModule;

const configuredAdmin = getAddress(parameters.admin);
const configuredTreasury = getAddress(
  parameters.treasuryWallet,
);

const { viem, networkName } =
  await network.create("bscTestnet");

const client = await viem.getPublicClient();
const walletClients = await viem.getWalletClients();
const deployer = walletClients[0];

if (deployer === undefined || deployer.account === undefined) {
  throw new Error("Deployer nao encontrada.");
}

const deployerAddress = getAddress(
  deployer.account.address,
);

const chainId = await client.getChainId();

const correctNetwork =
  networkName === "bscTestnet" && chainId === 97;

const correctDeployer =
  deployerAddress === EXPECTED_DEPLOYER;

console.log("Rede:");
console.log(`Nome: ${networkName}`);
console.log(`Chain ID: ${chainId}`);
console.log(`Rede correta: ${correctNetwork}`);
console.log(`Deployer correta: ${correctDeployer}`);

const configuredToken = getAddress(
  await client.readContract({
    address: ACCESS,
    abi: accessAbi,
    functionName: "jolr",
  }),
);

const onChainTreasury = getAddress(
  await client.readContract({
    address: ACCESS,
    abi: accessAbi,
    functionName: "treasury",
  }),
);

const pendingTreasury = getAddress(
  await client.readContract({
    address: ACCESS,
    abi: accessAbi,
    functionName: "pendingTreasury",
  }),
);

const pendingTreasuryExecutableAt =
  await client.readContract({
    address: ACCESS,
    abi: accessAbi,
    functionName: "pendingTreasuryExecutableAt",
  });

const paused = await client.readContract({
  address: ACCESS,
  abi: accessAbi,
  functionName: "paused",
});

const correctToken =
  configuredToken === TOKEN;

const correctTreasury =
  onChainTreasury === configuredTreasury;

const noPendingTreasury =
  pendingTreasury.toLowerCase() === ZERO_ADDRESS &&
  Number(pendingTreasuryExecutableAt) === 0;

console.log("\nConfiguracao principal:");
console.log(`Token configurado: ${configuredToken}`);
console.log(`Token correto: ${correctToken}`);
console.log(`Treasury configurada: ${onChainTreasury}`);
console.log(`Treasury correta: ${correctTreasury}`);
console.log(`Pending Treasury: ${pendingTreasury}`);
console.log(
  `Sem alteracao de Treasury pendente: ${noPendingTreasury}`,
);
console.log(`Access pausado: ${paused}`);

const basicId = await client.readContract({
  address: ACCESS,
  abi: accessAbi,
  functionName: "BASIC_PLAN",
});

const proId = await client.readContract({
  address: ACCESS,
  abi: accessAbi,
  functionName: "PRO_PLAN",
});

const eliteId = await client.readContract({
  address: ACCESS,
  abi: accessAbi,
  functionName: "ELITE_PLAN",
});

const maxMonths = await client.readContract({
  address: ACCESS,
  abi: accessAbi,
  functionName: "MAX_MONTHS_PER_PURCHASE",
});

const configDelay = await client.readContract({
  address: ACCESS,
  abi: accessAbi,
  functionName: "CONFIG_DELAY",
});

const billingPeriod = await client.readContract({
  address: ACCESS,
  abi: accessAbi,
  functionName: "BILLING_PERIOD",
});

const constantsCorrect =
  basicId === 1 &&
  proId === 2 &&
  eliteId === 3 &&
  maxMonths === 12 &&
  Number(configDelay) === 2 * 24 * 60 * 60 &&
  Number(billingPeriod) === 30 * 24 * 60 * 60;

console.log("\nConstantes:");
console.log(`BASIC_PLAN: ${basicId}`);
console.log(`PRO_PLAN: ${proId}`);
console.log(`ELITE_PLAN: ${eliteId}`);
console.log(`Maximo de meses: ${maxMonths}`);
console.log(
  `Atraso de configuracao: ${configDelay} segundos`,
);
console.log(
  `Periodo de cobranca: ${billingPeriod} segundos`,
);
console.log(`Constantes corretas: ${constantsCorrect}`);

const decimals = await client.readContract({
  address: TOKEN,
  abi: tokenAbi,
  functionName: "decimals",
});

const tokenUnit = 10n ** BigInt(decimals);

const expectedPlans: PlanExpectation[] = [
  {
    label: "Basic",
    id: 1,
    minimumTokens: 10_000n,
    monthlyTokens: 500n,
  },
  {
    label: "Pro",
    id: 2,
    minimumTokens: 50_000n,
    monthlyTokens: 2_000n,
  },
  {
    label: "Elite",
    id: 3,
    minimumTokens: 200_000n,
    monthlyTokens: 7_500n,
  },
];

let allPlansCorrect = true;

console.log("\nPlanos:");

for (const expected of expectedPlans) {
  const plan = await client.readContract({
    address: ACCESS,
    abi: accessAbi,
    functionName: "getPlan",
    args: [expected.id],
  });

  const expectedMinimum =
    expected.minimumTokens * tokenUnit;

  const expectedMonthly =
    expected.monthlyTokens * tokenUnit;

  const planCorrect =
    plan.minimumBalance === expectedMinimum &&
    plan.monthlyFee === expectedMonthly &&
    plan.enabled;

  if (!planCorrect) {
    allPlansCorrect = false;
  }

  const requiredForOneMonth =
    plan.minimumBalance + plan.monthlyFee;

  const requiredForTwelveMonths =
    plan.minimumBalance + plan.monthlyFee * 12n;

  console.log(`\n${expected.label}:`);
  console.log(`ID: ${expected.id}`);
  console.log(
    `Saldo minimo: ${formatUnits(
      plan.minimumBalance,
      decimals,
    )} JOLR`,
  );
  console.log(
    `Mensalidade: ${formatUnits(
      plan.monthlyFee,
      decimals,
    )} JOLR`,
  );
  console.log(`Ativo: ${plan.enabled}`);
  console.log(
    `Necessario para 1 mes: ${formatUnits(
      requiredForOneMonth,
      decimals,
    )} JOLR`,
  );
  console.log(
    `Necessario para 12 meses: ${formatUnits(
      requiredForTwelveMonths,
      decimals,
    )} JOLR`,
  );
  console.log(`Plano correto: ${planCorrect}`);
}

const treasuryBalance = await client.readContract({
  address: TOKEN,
  abi: tokenAbi,
  functionName: "balanceOf",
  args: [configuredTreasury],
});

const accessContractBalance =
  await client.readContract({
    address: TOKEN,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [ACCESS],
  });

const correctInitialTreasuryBalance =
  treasuryBalance === 20_000_000n * tokenUnit;

const correctAccessContractBalance =
  accessContractBalance === 0n;

console.log("\nSaldos relacionados ao Access:");
console.log(
  `Treasury: ${formatUnits(
    treasuryBalance,
    decimals,
  )} JOLR`,
);
console.log(
  `Saldo inicial da Treasury correto: ${correctInitialTreasuryBalance}`,
);
console.log(
  `Contrato Access: ${formatUnits(
    accessContractBalance,
    decimals,
  )} JOLR`,
);
console.log(
  `Contrato Access sem tokens retidos: ${correctAccessContractBalance}`,
);

const adminHasAccess = await client.readContract({
  address: ACCESS,
  abi: accessAbi,
  functionName: "hasAccess",
  args: [configuredAdmin],
});

const deployerHasAccess =
  await client.readContract({
    address: ACCESS,
    abi: accessAbi,
    functionName: "hasAccess",
    args: [deployerAddress],
  });

const noUnexpectedSubscriptions =
  !adminHasAccess && !deployerHasAccess;

console.log("\nAssinaturas iniciais:");
console.log(`Admin possui acesso: ${adminHasAccess}`);
console.log(`Deployer possui acesso: ${deployerHasAccess}`);
console.log(
  `Sem assinaturas inesperadas: ${noUnexpectedSubscriptions}`,
);

const validationPassed =
  correctNetwork &&
  correctDeployer &&
  correctToken &&
  correctTreasury &&
  noPendingTreasury &&
  !paused &&
  constantsCorrect &&
  allPlansCorrect &&
  correctInitialTreasuryBalance &&
  correctAccessContractBalance &&
  noUnexpectedSubscriptions;

console.log("\nResultado final:");
console.log(
  validationPassed
    ? "VALIDACAO DO JOLERI ACCESS V2 APROVADA"
    : "VALIDACAO DO JOLERI ACCESS V2 REPROVADA",
);

if (!validationPassed) {
  process.exitCode = 1;
}