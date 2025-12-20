// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PayLock is ReentrancyGuard, Ownable {
    struct Item {
        uint256 id;
        address payable seller;
        string name;
        string ipfsCid;       // The ENCRYPTED full file
        string previewCid;    // The UNENCRYPTED preview (blurred img / short clip)
        string fileType;      // "image", "video", "audio", "other"
        uint256 price;
        address buyer;
        string encryptedKey;
        bool isSold;
        bool isKeyDelivered;
        uint256 listedAt;     // For history
        uint256 soldAt;       // For history
    }

    Item[] public items;

    event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 timestamp);
    event ItemPurchased(uint256 indexed id, address indexed buyer, uint256 timestamp);
    event KeyDelivered(uint256 indexed id, string encryptedKey, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    function listItem(
        string calldata _name, 
        string calldata _ipfsCid, 
        string calldata _previewCid,
        string calldata _fileType,
        uint256 _price
    ) external nonReentrant {
        require(_price > 0, "Price must be > 0");
        
        uint256 newId = items.length;
        items.push(Item({
            id: newId,
            seller: payable(msg.sender),
            name: _name,
            ipfsCid: _ipfsCid,
            previewCid: _previewCid,
            fileType: _fileType,
            price: _price,
            buyer: address(0),
            encryptedKey: "",
            isSold: false,
            isKeyDelivered: false,
            listedAt: block.timestamp,
            soldAt: 0
        }));
        
        emit ItemListed(newId, msg.sender, _price, _name, block.timestamp);
    }

    function buyItem(uint256 _id) external payable nonReentrant {
        Item storage item = items[_id];
        require(!item.isSold, "Item already sold");
        require(msg.value >= item.price, "Insufficient payment");
        require(msg.sender != item.seller, "Cannot buy your own item");

        item.buyer = msg.sender;
        item.isSold = true;
        item.soldAt = block.timestamp;

        emit ItemPurchased(_id, msg.sender, block.timestamp);
    }

    function deliverKey(uint256 _id, string calldata _keyForBuyer) external nonReentrant {
        Item storage item = items[_id];
        
        require(msg.sender == item.seller, "Only seller can deliver");
        require(item.isSold, "Item not sold yet");
        require(!item.isKeyDelivered, "Key already delivered");

        uint256 fee = item.price / 100; // 1% Fee
        uint256 sellerAmount = item.price - fee;

        (bool feeSuccess, ) = owner().call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");

        (bool sellerSuccess, ) = item.seller.call{value: sellerAmount}("");
        require(sellerSuccess, "Seller transfer failed");

        item.encryptedKey = _keyForBuyer;
        item.isKeyDelivered = true;

        emit KeyDelivered(_id, _keyForBuyer, block.timestamp);
    }

    function getMarketplaceItems() external view returns (Item[] memory) {
        return items;
    }
    
    // Fetch specific item for Shareable Links
    function getItem(uint256 _id) external view returns (Item memory) {
        return items[_id];
    }
}