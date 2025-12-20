// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract ChronosVault is ReentrancyGuard, Ownable, Pausable {
    struct Capsule {
        uint256 fileId;
        bytes32 contentHash; // Store as bytes32 for gas optimization
        bytes encryptedKey;
        uint256 unlockTime;
        address recipient;
        bool isClaimed;
    }

    mapping(uint256 => Capsule) public capsules;
    uint256 public nextCapsuleId;

    // Indexed events for high-performance indexing by the Watchtower
    event CapsuleCreated(uint256 indexed capsuleId, address indexed sender, address indexed recipient, uint256 unlockTime);
    event VoidSignal(uint256 indexed fileId, address indexed user, uint256 timestamp);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function createCapsule(
        uint256 _fileId,
        bytes32 _contentHash,
        bytes calldata _encryptedKey,
        uint256 _unlockTime,
        address _recipient
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(_unlockTime > block.timestamp, "Unlock time must be in future");
        require(_recipient != address(0), "Invalid recipient");

        capsules[nextCapsuleId] = Capsule({
            fileId: _fileId,
            contentHash: _contentHash,
            encryptedKey: _encryptedKey,
            unlockTime: _unlockTime,
            recipient: _recipient,
            isClaimed: false
        });

        emit CapsuleCreated(nextCapsuleId, msg.sender, _recipient, _unlockTime);
        nextCapsuleId++;
        return nextCapsuleId - 1;
    }

    // Signals the "Breakup Button" deletion to the Watchtower & Fisherman Nodes
    function signalVoid(uint256 _fileId) external whenNotPaused {
        emit VoidSignal(_fileId, msg.sender, block.timestamp);
    }

    function isReady(uint256 _capsuleId) external view returns (bool) {
        return block.timestamp >= capsules[_capsuleId].unlockTime;
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}