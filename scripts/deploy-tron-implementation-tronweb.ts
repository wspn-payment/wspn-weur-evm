import { ethers } from 'ethers';
import TronWeb from 'tronweb';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("Deploying ERC20F implementation using TronWeb...");

  // Setup TronWeb
  const tronWeb = new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',
    headers: { "TRON-PRO-API-KEY": process.env.TRON_PRO_API_KEY || '' },
    privateKey: process.env.TRON_PRIVATE_KEY as string
  });

  try {
    // Get implementation artifact
    const implementationArtifact = await import('../artifacts/contracts/ERC20F.sol/ERC20F.json');
    
    console.log("Creating implementation deployment transaction...");
    console.log("Deploying from address:", tronWeb.defaultAddress.base58);
    
    const contract = await tronWeb.contract().createContract({
      abi: implementationArtifact.abi,
      bytecode: implementationArtifact.bytecode,
      feeLimit: 1_000_000_000,
      callValue: 0,
      parameters: []
    });

    console.log("Implementation deployed to:", contract.address);
    console.log("Transaction:", contract.txId);
    
    // Wait for deployment confirmation
    let txInfo;
    do {
      await new Promise(resolve => setTimeout(resolve, 3000));
      txInfo = await tronWeb.trx.getTransactionInfo(contract.txId);
      console.log("Waiting for deployment confirmation...");
    } while (!txInfo.id);

    if (txInfo.receipt.result === 'SUCCESS') {
      console.log("Deployment successful!");
      console.log("Contract address:", contract.address);
      return contract.address;
    } else {
      throw new Error(`Deployment failed: ${txInfo.receipt.result}`);
    }

  } catch (error) {
    console.error("Implementation deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 