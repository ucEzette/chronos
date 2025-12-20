import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PayLock with account:", deployer.address);

  const PayLock = await ethers.getContractFactory("PayLock");
  const paylock = await PayLock.deploy();

  await paylock.waitForDeployment();

  console.log("PayLock Revenue Protocol deployed to:", await paylock.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});