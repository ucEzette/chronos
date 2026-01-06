// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PayLock is Ownable, ReentrancyGuard {
    
    struct Item {
        uint256 id;
        address payable seller;
        string name;
        string ipfsCid;
        string previewCid;
        string fileType;
        uint256 price;
        uint256 maxSupply;
        uint256 soldCount;
        bool isSoldOut;
        bool isActive;
    }

    struct Purchase {
        bool isPurchased;
        string encryptedKey;
        bool isDelivered;
    }

    // State Variables
    uint256 public itemCount;
    uint256 public serviceFeePercentage = 5; // Default 5%
    uint256 public accumulatedFees; // Track fees available for withdrawal

    mapping(uint256 => Item) public items;
    // Mapping: ItemID => BuyerAddress => PurchaseDetails
    mapping(uint256 => mapping(address => Purchase)) public purchases;

    // Events
    event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply);
    event ItemPurchased(uint256 indexed id, address indexed buyer);
    event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey);
    event ItemCanceled(uint256 indexed id, address indexed seller);
    event FeeUpdated(uint256 newFee);
    event FeesWithdrawn(address indexed owner, uint256 amount);

    constructor() Ownable(msg.sender) {}

    // --- MARKETPLACE ACTIONS ---

    function listItem(
        string memory _name, 
        string memory _ipfsCid, 
        string memory _previewCid,
        string memory _fileType,
        uint256 _price, 
        uint256 _maxSupply
    ) external nonReentrant {
        require(_maxSupply > 0, "Supply must be > 0");

        itemCount++;
        items[itemCount] = Item({
            id: itemCount,
            seller: payable(msg.sender),
            name: _name,
            ipfsCid: _ipfsCid,
            previewCid: _previewCid,
            fileType: _fileType,
            price: _price,
            maxSupply: _maxSupply,
            soldCount: 0,
            isSoldOut: false,
            isActive: true
        });

        emit ItemListed(itemCount, msg.sender, _price, _name, _maxSupply);
    }

    function buyItem(uint256 _id) external payable nonReentrant {
        Item storage item = items[_id];
        require(item.isActive, "Item is not active");
        require(!item.isSoldOut, "Item is sold out");
        require(msg.value >= item.price, "Insufficient funds sent");
        require(!purchases[_id][msg.sender].isPurchased, "Already purchased");

        // ESCROW LOGIC: Funds are held in the contract automatically 
        // We do NOT transfer to seller here.

        // Update Item State
        item.soldCount++;
        if (item.soldCount >= item.maxSupply) {
            item.isSoldOut = true;
        }

        // Update Purchase State
        purchases[_id][msg.sender] = Purchase({
            isPurchased: true,
            encryptedKey: "",
            isDelivered: false
        });

        emit ItemPurchased(_id, msg.sender);
    }

    /**
     * @dev Seller releases the key. Contract calculates fee, keeps it, and sends remainder to seller.
     */
    function deliverKey(uint256 _id, address _buyer, string memory _keyForBuyer) external nonReentrant {
        Item storage item = items[_id];
        Purchase storage purchase = purchases[_id][_buyer];

        require(msg.sender == item.seller, "Only seller can deliver key");
        require(purchase.isPurchased, "Buyer has not purchased");
        require(!purchase.isDelivered, "Key already delivered");

        // 1. Update State
        purchase.encryptedKey = _keyForBuyer;
        purchase.isDelivered = true;

        // 2. Calculate Fee & Payout
        uint256 feeAmount = (item.price * serviceFeePercentage) / 100;
        uint256 sellerAmount = item.price - feeAmount;

        // 3. Update Fee Balance
        accumulatedFees += feeAmount;

        // 4. Transfer Payout to Seller
        (bool success, ) = item.seller.call{value: sellerAmount}("");
        require(success, "Transfer to seller failed");

        emit KeyDelivered(_id, _buyer, _keyForBuyer);
    }

    function cancelListing(uint256 _id) external {
        Item storage item = items[_id];
        require(msg.sender == item.seller, "Only seller can cancel");
        require(item.soldCount == 0, "Cannot cancel items with active sales");
        
        item.isActive = false;
        item.isSoldOut = true;
        emit ItemCanceled(_id, msg.sender);
    }

    // --- OWNER FUNCTIONS ---

    function setFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 20, "Fee cannot exceed 20%");
        serviceFeePercentage = _newFee;
        emit FeeUpdated(_newFee);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = accumulatedFees;
        require(balance > 0, "No fees to withdraw");

        accumulatedFees = 0;
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");

        emit FeesWithdrawn(owner(), balance);
    }

    // --- VIEW FUNCTIONS ---

    function getMarketplaceItems() external view returns (Item[] memory) {
        // Returns all items (filtering done on frontend for efficiency)
        Item[] memory allItems = new Item[](itemCount);
        for (uint256 i = 1; i <= itemCount; i++) {
            allItems[i - 1] = items[i];
        }
        return allItems;
    }

    function checkOwnership(uint256 _id, address _user) external view returns (bool bought, string memory key) {
        Purchase memory p = purchases[_id][_user];
        return (p.isPurchased, p.encryptedKey);
    }
}