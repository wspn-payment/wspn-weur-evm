import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@layerzerolabs/hardhat-deploy";
import "@layerzerolabs/hardhat-tron";
import "@openzeppelin/hardhat-upgrades";
import "dotenv/config";

// Load environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const AMOY_RPC_URL = process.env.AMOY_RPC_URL || "";
const TRON_SHASTA_RPC_URL = process.env.TRON_SHASTA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const TRON_PRIVATE_KEY = process.env.TRON_PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  tronSolc: {
    enable: true,
    // Optional: specify an array of contract filenames (without path) to selectively compile. Leave as empty array to compile all contracts.
    filter: [],
    compilers: [{ version: "0.7.7" }, { version: "0.8.20" }], // can be any tron-solc version
    // Optional: Define version remappings for compiler versions
    versionRemapping: [
      ["0.7.7", "0.7.6"], // Remap version "0.7.7" to "0.7.6"
      ["0.8.22", "0.8.20"], // Remap version "0.8.20" to "0.8.19"
    ],
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
    bnb:{
      url: process.env.BNB_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 56,
    },
    amoy: {
        url: AMOY_RPC_URL,
        accounts: [PRIVATE_KEY],
        chainId: 80002,
      },
    tron_shasta: {
      url: process.env.TRON_SHASTA_RPC_URL || "https://api.shasta.trongrid.io/jsonrpc",
      tron: true,
      httpHeaders: { "TRON-PRO-API-KEY": process.env.TRON_PRO_API_KEY || "" },
      accounts: process.env.TRON_PRIVATE_KEY ? [process.env.TRON_PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  external: {
    contracts: [
      {
        artifacts: "node_modules/@openzeppelin/contracts/proxy/ERC1967"
      }
    ]
  }
};

export default config; 