import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  formatUnits,
  getAddress,
  parseAbi,
} from "viem";
import { bscTestnet } from "viem/chains";

const TOKEN = getAddress(
  "0xFE67d22F3540B4368340e2043B404bB7205eC441",
);

const ACCESS = getAddress(
  "0x8148Eb91811296DaE1c01008cdf54bEA18e45DDe",
);

const EXPECTED_TESTER = getAddress(
  "0x1D34F5b9FAfcCb22bc0Bca4D3dC0d42b309a0eE4",
);

const BASIC_PLAN_ID = 1;
const PURCHASE_MONTHS = 1;
const TOKEN_UNIT = 10n ** 18n;
const EXPECTED_BASIC_MINIMUM = 10_000n * TOKEN_UNIT;
const EXPECTED_BASIC_FEE = 500n * TOKEN_UNIT;
const EXPECTED_CHAIN_ID_HEX = "0x61";
const EXPLORER_TRANSACTION_URL = "https://testnet.bscscan.com/tx/";

const tokenAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
]);

const accessAbi = parseAbi([
  "function getPlan(uint8 planId) view returns ((uint128 minimumBalance, uint128 monthlyFee, bool enabled))",
  "function accessStatus(address subscriber) view returns (bool active, uint8 planId, uint64 expiresAt, uint256 minimumBalance, uint256 currentBalance)",
  "function subscribe(uint8 planId, uint16 monthsCount)",
]);

const elements = {
  connectButton: document.querySelector("#connectButton"),
  refreshButton: document.querySelector("#refreshButton"),
  approveButton: document.querySelector("#approveButton"),
  subscribeButton: document.querySelector("#subscribeButton"),
  statusBox: document.querySelector("#statusBox"),
  transactionLink: document.querySelector("#transactionLink"),
  networkValue: document.querySelector("#networkValue"),
  accountValue: document.querySelector("#accountValue"),
  accountValidation: document.querySelector("#accountValidation"),
  nativeBalance: document.querySelector("#nativeBalance"),
  tokenBalance: document.querySelector("#tokenBalance"),
  allowanceValue: document.querySelector("#allowanceValue"),
  minimumBalance: document.querySelector("#minimumBalance"),
  monthlyFee: document.querySelector("#monthlyFee"),
  requiredBalance: document.querySelector("#requiredBalance"),
  planEnabled: document.querySelector("#planEnabled"),
  accessBadge: document.querySelector("#accessBadge"),
  currentPlan: document.querySelector("#currentPlan"),
  expirationValue: document.querySelector("#expirationValue"),
};

let provider;
let publicClient;
let walletClient;
let connectedAccount;
let currentState;
let busy = false;
let listenersInstalled = false;

function setStatus(message, kind = "info") {
  elements.statusBox.textContent = message;
  elements.statusBox.className = `status ${kind}`;
  elements.transactionLink.hidden = true;
}

function setTransactionStatus(message, hash, kind = "pending") {
  elements.statusBox.textContent = message;
  elements.statusBox.className = `status ${kind}`;
  elements.transactionLink.href = `${EXPLORER_TRANSACTION_URL}${hash}`;
  elements.transactionLink.hidden = false;
}

function shortAddress(address) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function formatJolr(value, decimals) {
  const formatted = formatUnits(value, decimals);
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 6,
  }).format(Number(formatted))} JOLR`;
}

function formatTbnb(value) {
  return `${Number(formatEther(value)).toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} tBNB`;
}

function formatExpiration(timestamp) {
  if (timestamp === 0n) {
    return "Sem assinatura";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(Number(timestamp) * 1000));
}

function isCorrectTester(address) {
  return (
    address?.toLowerCase() === EXPECTED_TESTER.toLowerCase()
  );
}

function renderButtons() {
  const connected = currentState !== undefined;
  const correctAccount = connected && currentState.correctAccount;
  const sufficientBalance =
    connected && currentState.balance >= currentState.requiredBalance;
  const allowanceReady =
    connected && currentState.allowance === currentState.monthlyFee;
  const active = connected && currentState.active;
  const planEnabled = connected && currentState.planEnabled;

  elements.connectButton.disabled = busy;
  elements.refreshButton.disabled = busy || !connected;

  elements.approveButton.disabled =
    busy ||
    !correctAccount ||
    !sufficientBalance ||
    allowanceReady ||
    active;

  elements.subscribeButton.disabled =
    busy ||
    !correctAccount ||
    !sufficientBalance ||
    !allowanceReady ||
    active ||
    !planEnabled;

  elements.approveButton.textContent = allowanceReady
    ? "Aprovação concluída"
    : "Aprovar 500 JOLR";

  elements.subscribeButton.textContent = active
    ? "Assinatura ativa"
    : "Assinar Basic por 1 mês";
}

function setBusy(value) {
  busy = value;
  renderButtons();
}

function getProvider() {
  if (
    window.ethereum === undefined ||
    typeof window.ethereum.request !== "function"
  ) {
    throw new Error(
      "MetaMask não encontrada. Abra esta página no perfil do Chrome que possui a extensão.",
    );
  }

  return window.ethereum;
}

async function ensureBscTestnet() {
  const currentChainId = await provider.request({
    method: "eth_chainId",
  });

  if (currentChainId.toLowerCase() === EXPECTED_CHAIN_ID_HEX) {
    return;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: EXPECTED_CHAIN_ID_HEX }],
    });
  } catch (error) {
    if (error?.code !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: EXPECTED_CHAIN_ID_HEX,
          chainName: "BNB Smart Chain Testnet",
          nativeCurrency: {
            name: "Test BNB",
            symbol: "tBNB",
            decimals: 18,
          },
          rpcUrls: ["https://bsc-testnet-dataseed.bnbchain.org"],
          blockExplorerUrls: ["https://testnet.bscscan.com"],
        },
      ],
    });
  }
}

function installProviderListeners() {
  if (listenersInstalled || typeof provider.on !== "function") {
    return;
  }

  provider.on("accountsChanged", async (accounts) => {
    if (accounts.length === 0) {
      connectedAccount = undefined;
      currentState = undefined;
      setStatus("MetaMask desconectada.", "warning");
      renderButtons();
      return;
    }

    connectedAccount = getAddress(accounts[0]);

    try {
      await refreshState();
    } catch (error) {
      handleError(error);
    }
  });

  provider.on("chainChanged", async () => {
    try {
      await refreshState();
    } catch (error) {
      handleError(error);
    }
  });

  listenersInstalled = true;
}

async function connectWallet() {
  try {
    setBusy(true);
    setStatus("Solicitando conexão com a MetaMask…", "pending");

    provider = getProvider();
    await ensureBscTestnet();

    const transport = custom(provider);

    publicClient = createPublicClient({
      chain: bscTestnet,
      transport,
    });

    walletClient = createWalletClient({
      chain: bscTestnet,
      transport,
    });

    const accounts = await walletClient.requestAddresses();

    if (accounts.length === 0) {
      throw new Error("Nenhuma conta foi autorizada na MetaMask.");
    }

    connectedAccount = getAddress(accounts[0]);
    installProviderListeners();
    await refreshState();
  } catch (error) {
    handleError(error);
  } finally {
    setBusy(false);
  }
}

async function refreshState() {
  if (!publicClient || !walletClient || !connectedAccount) {
    throw new Error("Conecte a MetaMask primeiro.");
  }

  const chainIdHex = await provider.request({
    method: "eth_chainId",
  });

  if (chainIdHex.toLowerCase() !== EXPECTED_CHAIN_ID_HEX) {
    currentState = undefined;
    elements.networkValue.textContent = `Rede incorreta (${chainIdHex})`;
    throw new Error("Selecione BNB Smart Chain Testnet na MetaMask.");
  }

  const [
    nativeBalance,
    decimals,
    symbol,
    balance,
    allowance,
    plan,
    accessStatus,
  ] = await Promise.all([
    publicClient.getBalance({ address: connectedAccount }),
    publicClient.readContract({
      address: TOKEN,
      abi: tokenAbi,
      functionName: "decimals",
    }),
    publicClient.readContract({
      address: TOKEN,
      abi: tokenAbi,
      functionName: "symbol",
    }),
    publicClient.readContract({
      address: TOKEN,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [connectedAccount],
    }),
    publicClient.readContract({
      address: TOKEN,
      abi: tokenAbi,
      functionName: "allowance",
      args: [connectedAccount, ACCESS],
    }),
    publicClient.readContract({
      address: ACCESS,
      abi: accessAbi,
      functionName: "getPlan",
      args: [BASIC_PLAN_ID],
    }),
    publicClient.readContract({
      address: ACCESS,
      abi: accessAbi,
      functionName: "accessStatus",
      args: [connectedAccount],
    }),
  ]);

  if (symbol !== "JOLR" || decimals !== 18) {
    throw new Error("O contrato configurado não corresponde ao JOLR V2.");
  }

  if (
    plan.minimumBalance !== EXPECTED_BASIC_MINIMUM ||
    plan.monthlyFee !== EXPECTED_BASIC_FEE
  ) {
    throw new Error(
      "A configuração on-chain do plano Basic difere dos valores validados.",
    );
  }

  const [active, planId, expiresAt] = accessStatus;
  const requiredBalance = plan.minimumBalance + plan.monthlyFee;
  const correctAccount = isCorrectTester(connectedAccount);

  currentState = {
    nativeBalance,
    decimals,
    balance,
    allowance,
    minimumBalance: plan.minimumBalance,
    monthlyFee: plan.monthlyFee,
    requiredBalance,
    planEnabled: plan.enabled,
    active,
    planId,
    expiresAt,
    correctAccount,
  };

  elements.networkValue.textContent = "BNB Smart Chain Testnet (97)";
  elements.accountValue.textContent = shortAddress(connectedAccount);
  elements.accountValidation.textContent = correctAccount
    ? "Joleri Tester confirmada"
    : "Conta incorreta";
  elements.accountValidation.className = correctAccount ? "good" : "bad";
  elements.nativeBalance.textContent = formatTbnb(nativeBalance);
  elements.tokenBalance.textContent = formatJolr(balance, decimals);
  elements.allowanceValue.textContent = formatJolr(allowance, decimals);
  elements.minimumBalance.textContent = formatJolr(
    plan.minimumBalance,
    decimals,
  );
  elements.monthlyFee.textContent = formatJolr(plan.monthlyFee, decimals);
  elements.requiredBalance.textContent = formatJolr(
    requiredBalance,
    decimals,
  );
  elements.planEnabled.textContent = plan.enabled ? "Sim" : "Não";
  elements.currentPlan.textContent = planId === 0 ? "Nenhum" : String(planId);
  elements.expirationValue.textContent = formatExpiration(expiresAt);
  elements.accessBadge.textContent = active ? "Acesso ativo" : "Sem acesso";
  elements.accessBadge.className = `access-badge ${
    active ? "active" : "inactive"
  }`;

  if (!correctAccount) {
    setStatus(
      `Conta incorreta. Selecione Joleri Tester (${shortAddress(
        EXPECTED_TESTER,
      )}) na MetaMask.`,
      "warning",
    );
  } else if (active) {
    setStatus("Assinatura Basic ativa e validada on-chain.", "success");
  } else if (balance < requiredBalance) {
    setStatus(
      `Saldo insuficiente. São necessários ${formatJolr(
        requiredBalance,
        decimals,
      )}.`,
      "warning",
    );
  } else if (allowance !== plan.monthlyFee) {
    setStatus(
      "Pré-validação concluída. O próximo passo é aprovar exatamente 500 JOLR.",
      "info",
    );
  } else {
    setStatus(
      "Aprovação confirmada. A assinatura Basic já pode ser enviada.",
      "success",
    );
  }

  renderButtons();
}

async function assertReadyAccount() {
  const accounts = await walletClient.getAddresses();

  if (accounts.length === 0) {
    throw new Error("MetaMask desconectada.");
  }

  connectedAccount = getAddress(accounts[0]);

  if (!isCorrectTester(connectedAccount)) {
    throw new Error("Selecione a conta Joleri Tester na MetaMask.");
  }

  const chainIdHex = await provider.request({ method: "eth_chainId" });

  if (chainIdHex.toLowerCase() !== EXPECTED_CHAIN_ID_HEX) {
    throw new Error("Selecione BNB Smart Chain Testnet na MetaMask.");
  }
}

async function approveMonthlyFee() {
  try {
    setBusy(true);
    await assertReadyAccount();
    await refreshState();

    if (currentState.active) {
      throw new Error("A assinatura já está ativa.");
    }

    if (currentState.balance < currentState.requiredBalance) {
      throw new Error("Saldo JOLR insuficiente para o plano Basic.");
    }

    if (currentState.allowance === currentState.monthlyFee) {
      throw new Error("A mensalidade exata de 500 JOLR já está aprovada.");
    }

    setStatus("Simulando a aprovação de 500 JOLR…", "pending");

    const { request } = await publicClient.simulateContract({
      address: TOKEN,
      abi: tokenAbi,
      functionName: "approve",
      args: [ACCESS, currentState.monthlyFee],
      account: connectedAccount,
    });

    const hash = await walletClient.writeContract(request);

    setTransactionStatus(
      "Aprovação enviada. Aguardando confirmação…",
      hash,
    );

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    if (receipt.status !== "success") {
      throw new Error("A transação de aprovação falhou.");
    }

    await refreshState();
    setTransactionStatus("Aprovação de 500 JOLR confirmada.", hash, "success");
  } catch (error) {
    handleError(error);
  } finally {
    setBusy(false);
  }
}

async function subscribeBasic() {
  try {
    setBusy(true);
    await assertReadyAccount();
    await refreshState();

    if (currentState.active) {
      throw new Error("A assinatura já está ativa.");
    }

    if (!currentState.planEnabled) {
      throw new Error("O plano Basic está desabilitado.");
    }

    if (currentState.balance < currentState.requiredBalance) {
      throw new Error("Saldo JOLR insuficiente para o plano Basic.");
    }

    if (currentState.allowance !== currentState.monthlyFee) {
      throw new Error("Aprove exatamente 500 JOLR antes de assinar.");
    }

    setStatus("Simulando a assinatura Basic…", "pending");

    const { request } = await publicClient.simulateContract({
      address: ACCESS,
      abi: accessAbi,
      functionName: "subscribe",
      args: [BASIC_PLAN_ID, PURCHASE_MONTHS],
      account: connectedAccount,
    });

    const hash = await walletClient.writeContract(request);

    setTransactionStatus(
      "Assinatura enviada. Aguardando confirmação…",
      hash,
    );

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    if (receipt.status !== "success") {
      throw new Error("A transação de assinatura falhou.");
    }

    await refreshState();

    if (!currentState.active) {
      throw new Error(
        "A transação confirmou, mas o acesso ainda não aparece como ativo.",
      );
    }

    setTransactionStatus("Assinatura Basic ativada com sucesso.", hash, "success");
  } catch (error) {
    handleError(error);
  } finally {
    setBusy(false);
  }
}

function handleError(error) {
  const message =
    error?.shortMessage ||
    error?.details ||
    error?.message ||
    "Erro desconhecido.";

  const rejected =
    error?.code === 4001 ||
    message.toLowerCase().includes("user rejected") ||
    message.toLowerCase().includes("user denied");

  setStatus(
    rejected ? "Operação cancelada na MetaMask." : message,
    rejected ? "warning" : "error",
  );
  renderButtons();
}

elements.connectButton.addEventListener("click", connectWallet);

elements.refreshButton.addEventListener("click", async () => {
  try {
    setBusy(true);
    await refreshState();
  } catch (error) {
    handleError(error);
  } finally {
    setBusy(false);
  }
});

elements.approveButton.addEventListener("click", approveMonthlyFee);
elements.subscribeButton.addEventListener("click", subscribeBasic);

if (window.ethereum === undefined) {
  setStatus(
    "MetaMask não encontrada neste perfil do navegador.",
    "error",
  );
}

renderButtons();
