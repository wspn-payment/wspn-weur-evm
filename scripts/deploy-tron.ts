import { readFileSync } from 'fs';
import { Fireblocks, BasePath } from '@fireblocks/ts-sdk';
import { ethers } from 'ethers';
import { getProxyFactory } from '@openzeppelin/hardhat-upgrades/dist/utils';
import hre from 'hardhat';
import TronWeb from 'tronweb';

async function main() {
  console.log("Deploying ERC20F with UUPS proxy...");

  const apiKey = process.env.FIREBLOCKS_API_KEY;
  if (!apiKey) throw new Error("FIREBLOCKS_API_KEY not set");
  
  process.env.FIREBLOCKS_BASE_PATH = BasePath.US;
  process.env.FIREBLOCKS_API_KEY = apiKey;
  process.env.FIREBLOCKS_SECRET_KEY = readFileSync("./fireblocks_secret_test.key", "utf8");

  const fireblocks = new Fireblocks();

  try {
    const implementationArtifact = await import('../artifacts/contracts/ERC20F.sol/ERC20F.json');
    
    // Get proxy factory and bytecode
    const proxyFactory = await getProxyFactory(hre);
    const proxyBytecode = proxyFactory.bytecode;
    const proxyAbi = [
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "implementation",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "data",
            "type": "bytes"
          }
        ],
        "stateMutability": "payable",
        "type": "constructor"
      }
    ];

    // First deploy implementation
    console.log("Creating implementation deployment transaction...");
    console.log("Implementation bytecode length:", implementationArtifact.bytecode.length);
    console.log("Implementation bytecode:", implementationArtifact.bytecode);
    
    const implTx = await fireblocks.transactions.createTransaction({
      transactionRequest: {
        operation: "CONTRACT_CALL",
        assetId: "TRX_TEST",
        source: {
          type: "VAULT_ACCOUNT",
          id: "53"
        },
        destination: {
          type: "ONE_TIME_ADDRESS",
          oneTimeAddress: {
            address: "0x0"
          }
        },
        // amount: "0",
        note: "Deploy ERC20F Implementation",
        networkFee: "1000000000",
        extraParameters: {
        //   contractAbi: JSON.stringify(implementationArtifact.abi),
          contractCallData: implementationArtifact.bytecode,
        }
      }
    });

    console.log("Implementation transaction details:", JSON.stringify(implTx.data, null, 2));

    // Wait for implementation transaction to complete
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
    if (!implAddress) throw new Error("Implementation address not found");

    // Then deploy proxy pointing to implementation
    const initializeFunc = implementationArtifact.abi
      .find(x => x.type === 'function' && x.name === 'initialize');

    
    
    if (!initializeFunc) throw new Error("Initialize function not found in ABI");

    const iface = new ethers.Interface(implementationArtifact.abi);
    const initData = iface.encodeFunctionData("initialize", [
      "WUSD",
      "WUSD",
      "TUZLtCCicTtPSVGpPxJh2iwiX5c6TxMsxj",
      "TUZLtCCicTtPSVGpPxJh2iwiX5c6TxMsxj",
      "TUZLtCCicTtPSVGpPxJh2iwiX5c6TxMsxj"
    ]);

    const proxyTx = await fireblocks.transactions.createTransaction({
      transactionRequest: {
        assetId: "TRX_TEST",
        source: {
          type: "VAULT_ACCOUNT",
          id: "53"
        },
        destination: {
          type: "ONE_TIME_ADDRESS",
          oneTimeAddress: {
            address: "0x0"
          }
        },
        amount: "0",
        note: "Deploy ERC20F Proxy",
        networkFee: "1000000000",
        extraParameters: {
          contractAbi: JSON.stringify(proxyAbi),
          contractBytecode: proxyBytecode,
          constructorParams: [
            implAddress,  // Use retrieved address
            initData
          ]
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 