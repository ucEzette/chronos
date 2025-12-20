import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const ChronosVault = await ethers.getContractFactory("ChronosVault");
  const vault = await ChronosVault.deploy(deployer.address);

  await vault.waitForDeployment();

  console.log(`ChronosVault deployed to ${await vault.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});