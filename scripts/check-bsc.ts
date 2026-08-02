import { network } from "hardhat";
import { formatEther } from "viem";

const faucetTransactionHash =
  "0xf06eeddee586c3a96326025a8a4b1a7cbffb36d56e6e62fcc241a14094c821eb";

const { viem, networkName } = await network.create("bscTestnet");

const walletClients = await viem.getWalletClients();
const wallet = walletClients[0];

if (wallet === undefined || wallet.account === undefined) {
  throw new Error("Nenhuma conta Deployer foi configurada.");
}

const client = await viem.getPublicClient();

const deployerBalance = await client.getBalance({
  address: wallet.account.address,
});

console.log(`Rede: ${networkName}`);
console.log(`Deployer: ${wallet.account.address}`);
console.log(`Saldo da Deployer: ${formatEther(deployerBalance)} tBNB`);

try {
  const transaction = await client.getTransaction({
    hash: faucetTransactionHash,
  });

  console.log(`Destino do faucet: ${transaction.to}`);

  if (transaction.to !== null) {
    const destinationBalance = await client.getBalance({
      address: transaction.to,
    });

    console.log(
      `Saldo no destino do faucet: ${formatEther(destinationBalance)} tBNB`,
    );

    console.log(
      `Destino coincide com Deployer: ${
        transaction.to.toLowerCase() === wallet.account.address.toLowerCase()
      }`,
    );
  }
} catch {
  console.log("Transação do faucet não encontrada neste RPC.");
}