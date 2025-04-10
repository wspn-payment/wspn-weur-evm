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
  console.log("Deploying ERC20F with UUPS proxy...");

  // Setup Fireblocks SDK
  const apiKey = process.env.FIREBLOCKS_API_KEY;
  if (!apiKey) throw new Error("FIREBLOCKS_API_KEY not set");
  
  process.env.FIREBLOCKS_BASE_PATH = BasePath.US;
  process.env.FIREBLOCKS_API_KEY = apiKey;
  process.env.FIREBLOCKS_SECRET_KEY = readFileSync("./fireblocks_secret_test.key", "utf8");
  const name = "Worldwide USD";
  const symbol = "WUSD";
  const defaultAdmin = "0x356b4b1DcD6AA70563E48F1E734E5fc80888B270"; // Admin address
  const minter = "0xe46709FA97856d1416b05cFB3667b5b7A44987fb"; // Minter address
  const pauser = "0xD47DC5499828bBAe5990c7139Db6fc387DAb8DFE";  // Pauser address

  const fireblocks = new Fireblocks();

  try {
    // Get contract artifacts
    const implementationArtifact = await import('../artifacts/contracts/ERC20F.sol/ERC20F.json');

    // First deploy implementation
    console.log("Deploying implementation contract...");
    const implTx = await fireblocks.transactions.createTransaction({
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
        note: "Deploy ERC20F Implementation",
        // networkFee: "1000000000",
        extraParameters: {
          contractCallData: implementationArtifact.bytecode,
        }
      }
    });

    console.log("Implementation tx created:", implTx.data.id);

    // Wait for implementation address
    let implStatus = await fireblocks.transactions.getTransaction({
      txId: implTx.data.id || ''
    });

    while (implStatus.data.status !== "COMPLETED") {
      await new Promise(resolve => setTimeout(resolve, 5000));
      implStatus = await fireblocks.transactions.getTransaction({
        txId: implTx.data.id || ''
      });
      console.log("Implementation transaction status:", implStatus.data.status);
    }

    const implAddress = implStatus.data.destinationAddress as string;
    console.log("Implementation address:", implStatus.data);
    if (!implAddress) throw new Error("Implementation address not found");

    // Prepare initialization data
    const iface = new ethers.Interface(implementationArtifact.abi);
    const initData: ERC20FInitParams = {
      name,
      symbol,
      defaultAdmin, // Admin address
      minter, // Minter address
      pauser  // Pauser address
    };

    const { proxyBytecode, constructorArgs } = getProxyDeploymentData(implAddress, initData);


    // Deploy proxy
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
        // networkFee: "1000000000",
        extraParameters: {
          contractCallData: proxyBytecode + constructorArgs
        }
      }
    });

    console.log("Proxy tx created:", proxyTx.data.id);
    console.log("Implementation address:", implAddress);

  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

function getProxyDeploymentData(
    implementationAddress: string,
    initParams: ERC20FInitParams
  ): { proxyBytecode: string; constructorArgs: string } {
    const factory = new ERC20F__factory();
    
    // Encode initialization data with both parameters
    const initData = factory.interface.encodeFunctionData("initialize", [
      initParams.name,
      initParams.symbol,
      initParams.defaultAdmin,
      initParams.minter,
      initParams.pauser
    ]);
  
    const proxyInterface = new Interface(ERC1967ProxyArtifact.abi);
    
    // Encode the proxy constructor arguments
    const constructorArgs = proxyInterface.encodeDeploy([
      implementationAddress,
      initData
    ]);
  
    // Add debug logging
    console.log("Encoded Data:", {
      initData,
      constructorArgs,
      implementationAddress,
      initParams
    });
  
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