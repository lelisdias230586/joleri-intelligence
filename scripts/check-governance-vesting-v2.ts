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

const TEAM_VESTING = getAddress(
  "0x0ff68E74758ed82C18821DdeB4570ea4A5fd6254",
);

const PARTNERS_VESTING = getAddress(
  "0x5031aFFaB805F4728e65646d8befEc1740Ba9e43",
);

const EXPECTED_DEPLOYER = getAddress(
  "0x855e50dde2196ac5b3fa51d22e3673569c6e5f10",
);

const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const DAY = 24n * 60n * 60n;

const TEAM_DURATION = 3n * 365n * DAY;
const TEAM_CLIFF = 365n * DAY;

const PARTNERS_DURATION = 2n * 365n * DAY;
const PARTNERS_CLIFF = 180n * DAY;

const accessControlAbi = parseAbi([
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
]);

const tokenRoleAbi = parseAbi([
  "function PAUSER_ROLE() view returns (bytes32)",
]);

const accessRoleAbi = parseAbi([
  "function CONFIG_ROLE() view returns (bytes32)",
  "function PAUSER_ROLE() view returns (bytes32)",
]);

const pausableAbi = parseAbi([
  "function paused() view returns (bool)",
]);

const tokenAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
]);

const vestingAbi = parseAbi([
  "function owner() view returns (address)",
  "function start() view returns (uint256)",
  "function duration() view returns (uint256)",
  "function end() view returns (uint256)",
  "function cliff() view returns (uint256)",
  "function released(address token) view returns (uint256)",
  "function releasable(address token) view returns (uint256)",
]);

type JoleriParameters = {
  admin: Address;
  teamBeneficiary: Address;
  partnersBeneficiary: Address;
};

type VestingExpectation = {
  label: string;
  address: Address;
  beneficiary: Address;
  duration: bigint;
  cliffDuration: bigint;
  expectedTokens: bigint;
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
const teamBeneficiary = getAddress(
  parameters.teamBeneficiary,
);
const partnersBeneficiary = getAddress(
  parameters.partnersBeneficiary,
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
const latestBlock = await client.getBlock();
const currentTimestamp = latestBlock.timestamp;

const correctNetwork =
  networkName === "bscTestnet" && chainId === 97;

const correctDeployer =
  deployerAddress === EXPECTED_DEPLOYER;

function timestampToIso(timestamp: bigint): string {
  return new Date(
    Number(timestamp) * 1000,
  ).toISOString();
}

async function hasRole(
  contractAddress: Address,
  role: `0x${string}`,
  account: Address,
): Promise<boolean> {
  return client.readContract({
    address: contractAddress,
    abi: accessControlAbi,
    functionName: "hasRole",
    args: [role, account],
  });
}

async function getRoleAdmin(
  contractAddress: Address,
  role: `0x${string}`,
): Promise<`0x${string}`> {
  return client.readContract({
    address: contractAddress,
    abi: accessControlAbi,
    functionName: "getRoleAdmin",
    args: [role],
  });
}

console.log("Rede:");
console.log(`Nome: ${networkName}`);
console.log(`Chain ID: ${chainId}`);
console.log(`Rede correta: ${correctNetwork}`);
console.log(`Deployer: ${deployerAddress}`);
console.log(`Deployer correta: ${correctDeployer}`);
console.log(`Admin: ${configuredAdmin}`);
console.log(
  `Timestamp atual: ${timestampToIso(currentTimestamp)}`,
);

const tokenPauserRole = await client.readContract({
  address: TOKEN,
  abi: tokenRoleAbi,
  functionName: "PAUSER_ROLE",
});

const accessConfigRole = await client.readContract({
  address: ACCESS,
  abi: accessRoleAbi,
  functionName: "CONFIG_ROLE",
});

const accessPauserRole = await client.readContract({
  address: ACCESS,
  abi: accessRoleAbi,
  functionName: "PAUSER_ROLE",
});

const tokenAdminHasDefault = await hasRole(
  TOKEN,
  DEFAULT_ADMIN_ROLE,
  configuredAdmin,
);

const tokenAdminHasPauser = await hasRole(
  TOKEN,
  tokenPauserRole,
  configuredAdmin,
);

const tokenDeployerHasDefault = await hasRole(
  TOKEN,
  DEFAULT_ADMIN_ROLE,
  deployerAddress,
);

const tokenDeployerHasPauser = await hasRole(
  TOKEN,
  tokenPauserRole,
  deployerAddress,
);

const accessAdminHasDefault = await hasRole(
  ACCESS,
  DEFAULT_ADMIN_ROLE,
  configuredAdmin,
);

const accessAdminHasConfig = await hasRole(
  ACCESS,
  accessConfigRole,
  configuredAdmin,
);

const accessAdminHasPauser = await hasRole(
  ACCESS,
  accessPauserRole,
  configuredAdmin,
);

const accessDeployerHasDefault = await hasRole(
  ACCESS,
  DEFAULT_ADMIN_ROLE,
  deployerAddress,
);

const accessDeployerHasConfig = await hasRole(
  ACCESS,
  accessConfigRole,
  deployerAddress,
);

const accessDeployerHasPauser = await hasRole(
  ACCESS,
  accessPauserRole,
  deployerAddress,
);

const tokenPauserAdmin = await getRoleAdmin(
  TOKEN,
  tokenPauserRole,
);

const accessConfigAdmin = await getRoleAdmin(
  ACCESS,
  accessConfigRole,
);

const accessPauserAdmin = await getRoleAdmin(
  ACCESS,
  accessPauserRole,
);

const roleHierarchyCorrect =
  tokenPauserAdmin === DEFAULT_ADMIN_ROLE &&
  accessConfigAdmin === DEFAULT_ADMIN_ROLE &&
  accessPauserAdmin === DEFAULT_ADMIN_ROLE;

const tokenRolesCorrect =
  tokenAdminHasDefault &&
  tokenAdminHasPauser &&
  !tokenDeployerHasDefault &&
  !tokenDeployerHasPauser;

const accessRolesCorrect =
  accessAdminHasDefault &&
  accessAdminHasConfig &&
  accessAdminHasPauser &&
  !accessDeployerHasDefault &&
  !accessDeployerHasConfig &&
  !accessDeployerHasPauser;

console.log("\nFuncoes do JOLR Token:");
console.log(
  `Admin possui DEFAULT_ADMIN_ROLE: ${tokenAdminHasDefault}`,
);
console.log(
  `Admin possui PAUSER_ROLE: ${tokenAdminHasPauser}`,
);
console.log(
  `Deployer possui DEFAULT_ADMIN_ROLE: ${tokenDeployerHasDefault}`,
);
console.log(
  `Deployer possui PAUSER_ROLE: ${tokenDeployerHasPauser}`,
);
console.log(
  `Funcoes do token corretas: ${tokenRolesCorrect}`,
);

console.log("\nFuncoes do Joleri Access:");
console.log(
  `Admin possui DEFAULT_ADMIN_ROLE: ${accessAdminHasDefault}`,
);
console.log(
  `Admin possui CONFIG_ROLE: ${accessAdminHasConfig}`,
);
console.log(
  `Admin possui PAUSER_ROLE: ${accessAdminHasPauser}`,
);
console.log(
  `Deployer possui DEFAULT_ADMIN_ROLE: ${accessDeployerHasDefault}`,
);
console.log(
  `Deployer possui CONFIG_ROLE: ${accessDeployerHasConfig}`,
);
console.log(
  `Deployer possui PAUSER_ROLE: ${accessDeployerHasPauser}`,
);
console.log(
  `Funcoes do Access corretas: ${accessRolesCorrect}`,
);
console.log(
  `Hierarquia das funcoes correta: ${roleHierarchyCorrect}`,
);

const tokenPaused = await client.readContract({
  address: TOKEN,
  abi: pausableAbi,
  functionName: "paused",
});

const accessPaused = await client.readContract({
  address: ACCESS,
  abi: pausableAbi,
  functionName: "paused",
});

const operationalStateCorrect =
  !tokenPaused && !accessPaused;

console.log("\nEstado operacional:");
console.log(`JOLR Token pausado: ${tokenPaused}`);
console.log(`Joleri Access pausado: ${accessPaused}`);
console.log(
  `Estado operacional correto: ${operationalStateCorrect}`,
);

const decimals = await client.readContract({
  address: TOKEN,
  abi: tokenAbi,
  functionName: "decimals",
});

const tokenUnit = 10n ** BigInt(decimals);

async function checkVesting(
  expectation: VestingExpectation,
): Promise<boolean> {
  const owner = getAddress(
    await client.readContract({
      address: expectation.address,
      abi: vestingAbi,
      functionName: "owner",
    }),
  );

  const start = await client.readContract({
    address: expectation.address,
    abi: vestingAbi,
    functionName: "start",
  });

  const duration = await client.readContract({
    address: expectation.address,
    abi: vestingAbi,
    functionName: "duration",
  });

  const end = await client.readContract({
    address: expectation.address,
    abi: vestingAbi,
    functionName: "end",
  });

  const cliff = await client.readContract({
    address: expectation.address,
    abi: vestingAbi,
    functionName: "cliff",
  });

  const released = await client.readContract({
    address: expectation.address,
    abi: vestingAbi,
    functionName: "released",
    args: [TOKEN],
  });

  const releasable = await client.readContract({
    address: expectation.address,
    abi: vestingAbi,
    functionName: "releasable",
    args: [TOKEN],
  });

  const balance = await client.readContract({
    address: TOKEN,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [expectation.address],
  });

  const expectedBalance =
    expectation.expectedTokens * tokenUnit;

  const ownerCorrect =
    owner === expectation.beneficiary;

  const durationCorrect =
    duration === expectation.duration;

  const endCorrect =
    end === start + expectation.duration;

  const cliffCorrect =
    cliff === start + expectation.cliffDuration;

  const balanceCorrect =
    balance === expectedBalance;

  const releasedCorrect =
    released === 0n;

  const beforeCliff =
    currentTimestamp < cliff;

  const releasableCorrect =
    beforeCliff ? releasable === 0n : true;

  const vestingCorrect =
    ownerCorrect &&
    durationCorrect &&
    endCorrect &&
    cliffCorrect &&
    balanceCorrect &&
    releasedCorrect &&
    releasableCorrect;

  console.log(`\n${expectation.label}:`);
  console.log(`Contrato: ${expectation.address}`);
  console.log(`Beneficiario: ${owner}`);
  console.log(
    `Beneficiario correto: ${ownerCorrect}`,
  );
  console.log(
    `Inicio: ${timestampToIso(start)}`,
  );
  console.log(
    `Cliff: ${timestampToIso(cliff)}`,
  );
  console.log(
    `Fim: ${timestampToIso(end)}`,
  );
  console.log(
    `Duracao correta: ${durationCorrect}`,
  );
  console.log(
    `Cliff correto: ${cliffCorrect}`,
  );
  console.log(
    `Fim correto: ${endCorrect}`,
  );
  console.log(
    `Saldo: ${formatUnits(balance, decimals)} JOLR`,
  );
  console.log(
    `Saldo correto: ${balanceCorrect}`,
  );
  console.log(
    `Ja liberado: ${formatUnits(released, decimals)} JOLR`,
  );
  console.log(
    `Liberavel agora: ${formatUnits(
      releasable,
      decimals,
    )} JOLR`,
  );
  console.log(`Antes do cliff: ${beforeCliff}`);
  console.log(
    `Vesting correto: ${vestingCorrect}`,
  );

  return vestingCorrect;
}

const teamVestingCorrect = await checkVesting({
  label: "Team Vesting",
  address: TEAM_VESTING,
  beneficiary: teamBeneficiary,
  duration: TEAM_DURATION,
  cliffDuration: TEAM_CLIFF,
  expectedTokens: 15_000_000n,
});

const partnersVestingCorrect = await checkVesting({
  label: "Partners Vesting",
  address: PARTNERS_VESTING,
  beneficiary: partnersBeneficiary,
  duration: PARTNERS_DURATION,
  cliffDuration: PARTNERS_CLIFF,
  expectedTokens: 10_000_000n,
});

const validationPassed =
  correctNetwork &&
  correctDeployer &&
  tokenRolesCorrect &&
  accessRolesCorrect &&
  roleHierarchyCorrect &&
  operationalStateCorrect &&
  teamVestingCorrect &&
  partnersVestingCorrect;

console.log("\nResultado final:");
console.log(
  validationPassed
    ? "VALIDACAO DE GOVERNANCA E VESTING APROVADA"
    : "VALIDACAO DE GOVERNANCA E VESTING REPROVADA",
);

if (!validationPassed) {
  process.exitCode = 1;
}