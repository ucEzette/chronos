// contracts/ChronosVault.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ChronosVault is ReentrancyGuard {
    struct Capsule {
        uint256 fileId;       // DataHaven File ID
        string ipfsCid;       // Optional: IPFS backup CID
        bytes encryptedKey;   // The AES key encrypted with the contract's logic or user's future key
        uint256 unlockTime;   // Timestamp when the capsule opens
        address owner;        // Who can retrieve it
        bool exists;
    }

    mapping(uint256 => Capsule) public capsules;
    uint256 public nextCapsuleId;

    event CapsuleCreated(uint256 indexed capsuleId, address indexed owner, uint256 unlockTime);
    event CapsuleUnlocked(uint256 indexed capsuleId, address indexed owner);

    function createCapsule(
        uint256 _fileId,
        string memory _ipfsCid,
        bytes memory _encryptedKey,
        uint256 _unlockTime
    ) external nonReentrant returns (uint256) {
        require(_unlockTime > block.timestamp, "Unlock time must be in the future");

        capsules[nextCapsuleId] = Capsule({
            fileId: _fileId,
            ipfsCid: _ipfsCid,
            encryptedKey: _encryptedKey,
            unlockTime: _unlockTime,
            owner: msg.sender,
            exists: true
        });

        emit CapsuleCreated(nextCapsuleId, msg.sender, _unlockTime);
        nextCapsuleId++;
        return nextCapsuleId - 1;
    }

    function getCapsule(uint256 _capsuleId) external view returns (Capsule memory) {
        require(capsules[_capsuleId].exists, "Capsule does not exist");
        // Anyone can view metadata, but the key is just encrypted bytes
        return capsules[_capsuleId];
    }
    
    // Helper to check if a capsule is ready (for the frontend/watchtower)
    function isReady(uint256 _capsuleId) external view returns (bool) {
        if (!capsules[_capsuleId].exists) return false;
        return block.timestamp >= capsules[_capsuleId].unlockTime;
    }
}