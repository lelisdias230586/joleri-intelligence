import { readFileSync } from "node:fs";
import { network } from "hardhat";
import {
  formatEther,
  formatUnits,
  getAddress,
  parseAbi,
  type Address,
} from "viem";

const TOKEN = getAddress(
  "0xA573b140FBE3c4606182D6B31B2f4f812687afAb",
);

const ACCESS = getAddress(
  "0xb32479083a98C7Ce355d92C820799f33B47e8282",
);

const TEAM_VESTING = getAddress(
  "0xfC08cE20a5A50C70F11929E06DA0dBd0871D799D",
);

const PARTNERS_VESTING = getAddress(
  "0x92250FD67DEDBa7464ABF06Cbe3Bd155f9816804",
);

const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

type JoleriParameters = {
  ecosystemWallet: Address;
  treasuryWallet: Address;
  liquidityWallet: Address;
  securityWallet: Address;
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

const { viem, networkName } =
  await network.create("bscTestnet");

const client = await viem.getPublicClient();
const walletClients = await viem.getWalletClients();
const deployer = walletClients[0];

if (deployer === undefined || deployer.account === undefined) {
  throw new Error("Deployer não encontrada.");
}

console.log(`Rede: ${networkName}`);
console.log(`Deployer: ${deployer.account.address}`);

const nativeBalance = await client.getBalance({
  address: deployer.account.address,
});

console.log(
  `Saldo restante: ${formatEther(nativeBalance)} tBNB`,
);

const deployedContracts: Array<[string, Address]> = [
  ["JOLR Token", TOKEN],
  ["Joleri Access", ACCESS],
  ["Team Vesting", TEAM_VESTING],
  ["Partners Vesting", PARTNERS_VESTING],
];

console.log("\nCódigo dos contratos:");

for (const [name, address] of deployedContracts) {
  const code = await client.getCode({ address });

  console.log(
    `${name}: ${
      code !== undefined && code !== "0x" ? "OK" : "FALHA"
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

const expectedSupply =
  100_000_000n * 10n ** BigInt(decimals);

console.log("\nToken:");
console.log(`Nome: ${name}`);
console.log(`Símbolo: ${symbol}`);
console.log(`Decimais: ${decimals}`);
console.log(
  `Oferta: ${formatUnits(totalSupply, decimals)} JOLR`,
);
console.log(
  `Oferta fixa correta: ${totalSupply === expectedSupply}`,
);

const allocationWallets: Array<[string, Address]> = [
  ["Ecosystem", getAddress(parameters.ecosystemWallet)],
  ["Treasury", getAddress(parameters.treasuryWallet)],
  ["Liquidity", getAddress(parameters.liquidityWallet)],
  ["Security", getAddress(parameters.securityWallet)],
  ["Team Vesting", TEAM_VESTING],
  ["Partners Vesting", PARTNERS_VESTING],
];

let allocatedSupply = 0n;

console.log("\nDistribuição:");

for (const [label, address] of allocationWallets) {
  const balance = await client.readContract({
    address: TOKEN,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [address],
  });

  allocatedSupply += balance;

  console.log(
    `${label}: ${formatUnits(balance, decimals)} JOLR`,
  );
}

console.log(
  `Total distribuído: ${formatUnits(
    allocatedSupply,
    decimals,
  )} JOLR`,
);

console.log(
  `Oferta totalmente distribuída: ${
    allocatedSupply === totalSupply
  }`,
);