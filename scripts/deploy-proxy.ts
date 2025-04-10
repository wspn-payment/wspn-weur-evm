import { readFileSync } from 'fs';
import { Fireblocks, BasePath } from '@fireblocks/ts-sdk';
import { ethers, Interface } from 'ethers';
import { ERC20F__factory } from '../typechain-types/factories/contracts/ERC20F__factory';
import ERC1967ProxyArtifact from "@openzeppelin/contracts/build/contracts/ERC1967Proxy.json";

export interface ERC20FInitParams {
  name: string;
  symbol: string;
  defaultAdmin: string;
  minter: string;
  pauser: string;
}

async function main() {
  const implementationAddress = "0x133cd17b02b9464c27d846ad6e426c7e2cbe5a4c";
//   if (!implementationAddress) throw new Error("IMPLEMENTATION_ADDRESS not set");

  console.log("Deploying ERC20F proxy...");

  // Setup Fireblocks SDK
  const apiKey = process.env.FIREBLOCKS_API_KEY;
  if (!apiKey) throw new Error("FIREBLOCKS_API_KEY not set");
  
  process.env.FIREBLOCKS_BASE_PATH = BasePath.US;
  process.env.FIREBLOCKS_API_KEY = apiKey;
  process.env.FIREBLOCKS_SECRET_KEY = readFileSync("./fireblocks_secret_test.key", "utf8");

  const initData: ERC20FInitParams = {
    name: "Worldwide USD",
    symbol: "WUSD",
    defaultAdmin: "0x356b4b1DcD6AA70563E48F1E734E5fc80888B270",
    minter: "0xe46709FA97856d1416b05cFB3667b5b7A44987fb",
    pauser: "0xD47DC5499828bBAe5990c7139Db6fc387DAb8DFE"
  };

  const fireblocks = new Fireblocks();

  try {
    const { proxyBytecode, constructorArgs } = getProxyDeploymentData(implementationAddress, initData);

    console.log("Deploying proxy contract...");
    const proxyTx = await fireblocks.transactions.createTransaction({
      transactionRequest: {
        operation: "CONTRACT_CALL",
        assetId: "BNB_TEST",
        source: {
          type: "VAULT_ACCOUNT",
          id: "5"
        },
        destination: {
          type: "ONE_TIME_ADDRESS",
          oneTimeAddress: {
            address: "0x0"
          }
        },
        amount: "0",
        note: "Deploy ERC20F Proxy",
        extraParameters: {
          contractCallData: proxyBytecode + constructorArgs
        }
      }
    });

    console.log("Proxy tx created:", proxyTx.data.id);

    // Wait for proxy deployment
    let proxyStatus = await fireblocks.transactions.getTransaction({
      txId: proxyTx.data.id || ''
    });

    while (proxyStatus.data.status !== "COMPLETED") {
      await new Promise(resolve => setTimeout(resolve, 5000));
      proxyStatus = await fireblocks.transactions.getTransaction({
        txId: proxyTx.data.id || ''
      });
      console.log("Proxy transaction status:", proxyStatus.data.status);
    }

    console.log("Proxy deployment details:", proxyStatus.data);
    console.log("Proxy address:", proxyStatus.data.destinationAddress);

  } catch (error) {
    console.error("Proxy deployment failed:", error);
    throw error;
  }
}

function getProxyDeploymentData(
  implementationAddress: string,
  initParams: ERC20FInitParams
): { proxyBytecode: string; constructorArgs: string } {
  const factory = new ERC20F__factory();
  
  const initData = factory.interface.encodeFunctionData("initialize", [
    initParams.name,
    initParams.symbol,
    initParams.defaultAdmin,
    initParams.minter,
    initParams.pauser
  ]);

  const proxyInterface = new Interface(ERC1967ProxyArtifact.abi);
  
  const constructorArgs = proxyInterface.encodeDeploy([
    implementationAddress,
    initData
  ]);

  return {
    proxyBytecode: ERC1967ProxyArtifact.bytecode,
    constructorArgs: constructorArgs.slice(2)
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 