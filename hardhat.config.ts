import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import { fileURLToPath } from "node:url";

const solcPath = fileURLToPath(
  new URL("./node_modules/solc/soljson.js", import.meta.url),
);

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        path: solcPath,
        version: "0.8.28",
        settings: {
          evmVersion: "cancun",
        },
      },
      production: {
        path: solcPath,
        version: "0.8.28",
        settings: {
          evmVersion: "cancun",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    bscTestnet: {
      type: "http",
      chainType: "l1",
      chainId: 97,
      url: configVariable("BSC_TESTNET_RPC_URL"),
      accounts: [configVariable("BSC_TESTNET_PRIVATE_KEY")],
    },
    bscMainnet: {
      type: "http",
      chainType: "l1",
      chainId: 56,
      url: configVariable("BSC_MAINNET_RPC_URL"),
      accounts: [configVariable("BSC_MAINNET_PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
  coverage: {
    skipFiles: ["contracts/JoleriVestingWallet.sol"],
  },
});
