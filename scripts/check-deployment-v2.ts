import { readFileSync } from "node:fs";
import { network } from "hardhat";
import {
  formatEther,
  formatUnits,
  getAddress,
  parseAbi,
  type Address,
} from "viem";

const EXPECTED_DEPLOYER = getAddress(
  "0x855e50dde2196ac5b3fa51d22e3673569c6e5f10",
);

const EXPECTED_ADMIN = getAddress(
  "0x02FA52226F83d21F1A33233Aee88C8D31356B685",
);

const TOKEN = getAddress(
  "0xFE67d22F3540B4368340e2043B404bB7205eC441",
);

const ACCESS = getAddress(
  "0x8148Eb91811296DaE1c01008cdf54bEA18e45DDe",
);

const TEAM_VESTING = getAddress(
  "0x0ff68E74758ed82C18821DdeB4570ea4A5fd6254",
);

const PARTNERS_VESTING = getAddress(
  "0x5031aFFaB805F4728e65646d8befEc1740Ba9e43",
);

const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

const accessControlAbi = parseAbi([
  "function hasRole(bytes32 role, address account) view returns (bool)",
]);

type JoleriParameters = {
  admin: Address;
  ecosystemWallet: Address;
  treasuryWallet: Address;
  liquidityWallet: Address;
  securityWallet: Address;
};

type Allocation = {
  label: string;
  address: Address;
  tokens: bigint;
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
const nativeBalance = await client.getBalance({
  address: deployerAddress,
});

const correctNetwork =
  networkName === "bscTestnet" && chainId === 97;

const correctDeployer =
  deployerAddress === EXPECTED_DEPLOYER;

const correctConfiguredAdmin =
  configuredAdmin === EXPECTED_ADMIN;

console.log("Rede:");
console.log(`Nome: ${networkName}`);
console.log(`Chain ID: ${chainId}`);
console.log(`Rede correta: ${correctNetwork}`);

console.log("\nContas administrativas:");
console.log(`Deployer: ${deployerAddress}`);
console.log(`Deployer correta: ${correctDeployer}`);
console.log(`Admin configurada: ${configuredAdmin}`);
console.log(
  `Admin configurada corretamente: ${correctConfiguredAdmin}`,
);
console.log(
  `Admin separada da Deployer: ${
    configuredAdmin.toLowerCase() !==
    deployerAddress.toLowerCase()
  }`,
);
console.log(
  `Saldo restante: ${formatEther(nativeBalance)} tBNB`,
);

const deployedContracts: Array<[string, Address]> = [
  ["JOLR Token", TOKEN],
  ["Joleri Access", ACCESS],
  ["Team Vesting", TEAM_VESTING],
  ["Partners Vesting", PARTNERS_VESTING],
];

let allContractCodePresent = true;

console.log("\nCodigo dos contratos:");

for (const [name, address] of deployedContracts) {
  const code = await client.getCode({ address });
  const codePresent =
    code !== undefined && code !== "0x";

  if (!codePresent) {
    allContractCodePresent = false;
  }

  console.log(
    `${name}: ${address} | ${
      codePresent ? "OK" : "FALHA"
    }`,
  );
}

const name = await client.readContract({
  address: TOKEN,
  abi: tokenAbi,
  functionName: "name",
});

const symbol = await client.readContract({
  address: TOKEN,
  abi: tokenAbi,
  functionName: "symbol",
});

const decimals = await client.readContract({
  address: TOKEN,
  abi: tokenAbi,
  functionName: "decimals",
});

const totalSupply = await client.readContract({
  address: TOKEN,
  abi: tokenAbi,
  functionName: "totalSupply",
});

const tokenUnit = 10n ** BigInt(decimals);
const expectedSupply = 100_000_000n * tokenUnit;

const correctTokenMetadata =
  name === "Joleri Intelligence" &&
  symbol === "JOLR" &&
  decimals === 18;

const correctSupply =
  totalSupply === expectedSupply;

console.log("\nToken:");
console.log(`Nome: ${name}`);
console.log(`Simbolo: ${symbol}`);
console.log(`Decimais: ${decimals}`);
console.log(
  `Oferta: ${formatUnits(totalSupply, decimals)} JOLR`,
);
console.log(
  `Metadados corretos: ${correctTokenMetadata}`,
);
console.log(`Oferta fixa correta: ${correctSupply}`);

const allocations: Allocation[] = [
  {
    label: "Ecosystem",
    address: getAddress(parameters.ecosystemWallet),
    tokens: 35_000_000n,
  },
  {
    label: "Treasury",
    address: getAddress(parameters.treasuryWallet),
    tokens: 20_000_000n,
  },
  {
    label: "Liquidity",
    address: getAddress(parameters.liquidityWallet),
    tokens: 15_000_000n,
  },
  {
    label: "Security",
    address: getAddress(parameters.securityWallet),
    tokens: 5_000_000n,
  },
  {
    label: "Team Vesting",
    address: TEAM_VESTING,
    tokens: 15_000_000n,
  },
  {
    label: "Partners Vesting",
    address: PARTNERS_VESTING,
    tokens: 10_000_000n,
  },
];

let allocatedSupply = 0n;
let allAllocationsCorrect = true;

console.log("\nDistribuicao:");

for (const allocation of allocations) {
  const balance = await client.readContract({
    address: TOKEN,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [allocation.address],
  });

  const expectedBalance =
    allocation.tokens * tokenUnit;

  const allocationCorrect =
    balance === expectedBalance;

  if (!allocationCorrect) {
    allAllocationsCorrect = false;
  }

  allocatedSupply += balance;

  console.log(
    `${allocation.label}: ` +
      `${formatUnits(balance, decimals)} JOLR | ` +
      `esperado ${allocation.tokens} JOLR | ` +
      `${allocationCorrect ? "OK" : "FALHA"}`,
  );
}

const completeDistribution =
  allocatedSupply === totalSupply;

console.log(
  `Total distribuido: ${formatUnits(
    allocatedSupply,
    decimals,
  )} JOLR`,
);

console.log(
  `Oferta totalmente distribuida: ${completeDistribution}`,
);

const tokenAdminHasRole =
  await client.readContract({
    address: TOKEN,
    abi: accessControlAbi,
    functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, configuredAdmin],
  });

const tokenDeployerHasRole =
  await client.readContract({
    address: TOKEN,
    abi: accessControlAbi,
    functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, deployerAddress],
  });

const accessAdminHasRole =
  await client.readContract({
    address: ACCESS,
    abi: accessControlAbi,
    functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, configuredAdmin],
  });

const accessDeployerHasRole =
  await client.readContract({
    address: ACCESS,
    abi: accessControlAbi,
    functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, deployerAddress],
  });

const correctAdministrativeRoles =
  tokenAdminHasRole &&
  accessAdminHasRole &&
  !tokenDeployerHasRole &&
  !accessDeployerHasRole;

console.log("\nDEFAULT_ADMIN_ROLE:");

console.log(
  `Admin controla JOLR Token: ${tokenAdminHasRole}`,
);

console.log(
  `Deployer controla JOLR Token: ${tokenDeployerHasRole}`,
);

console.log(
  `Admin controla Joleri Access: ${accessAdminHasRole}`,
);

console.log(
  `Deployer controla Joleri Access: ${accessDeployerHasRole}`,
);

console.log(
  `Separacao administrativa correta: ${correctAdministrativeRoles}`,
);

const validationPassed =
  correctNetwork &&
  correctDeployer &&
  correctConfiguredAdmin &&
  allContractCodePresent &&
  correctTokenMetadata &&
  correctSupply &&
  allAllocationsCorrect &&
  completeDistribution &&
  correctAdministrativeRoles;

console.log("\nResultado final:");
console.log(
  validationPassed
    ? "VALIDACAO V2 APROVADA"
    : "VALIDACAO V2 REPROVADA",
);

if (!validationPassed) {
  process.exitCode = 1;
}