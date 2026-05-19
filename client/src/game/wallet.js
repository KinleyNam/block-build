import { BrowserProvider } from "ethers";

// Switch between "localhost" and "sepolia" to match your deployment target
const TARGET_NETWORK = "localhost";

const NETWORKS = {
  localhost: {
    chainId:        "0x7a69", // 31337 in hex
    chainName:      "Hardhat Local",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls:        ["http://127.0.0.1:8545"],
    blockExplorerUrls: [],
  },
  sepolia: {
    chainId:        "0xaa36a7", // 11155111 in hex
    chainName:      "Sepolia Testnet",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls:        ["https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};

async function switchNetwork() {
  const net = NETWORKS[TARGET_NETWORK];
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: net.chainId }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [net],
      });
    } else {
      throw err;
    }
  }
}

let _provider = null;
let _signer   = null;

export async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask is not installed.");

  await switchNetwork();

  _provider = new BrowserProvider(window.ethereum);
  await _provider.send("eth_requestAccounts", []);
  _signer = await _provider.getSigner();

  const address = await _signer.getAddress();
  return address;
}

export function getSigner()   { return _signer; }
export function getProvider() { return _provider; }
export function isConnected() { return _signer !== null; }
