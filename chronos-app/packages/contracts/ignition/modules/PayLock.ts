import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PayLockModule = buildModule("PayLockModule", (m) => {
    const paylock = m.contract("PayLock", []);

    return { paylock };
});

export default PayLockModule;
