// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PayLock is ReentrancyGuard, Ownable {
    struct Item {
        uint256 id;
        address payable seller;
        string name;
        string ipfsCid;
        string previewCid;
        string fileType;
        uint256 price;
        address buyer; // Deprecated for multi-supply, used for logs
        string encryptedKey; 
        
        // NEW FIELDS
        uint256 maxSupply;
        uint256 soldCount;
        bool isSoldOut;
    }

    Item[] public items;
    
    // Track keys per buyer: itemId => buyerAddress => key
    mapping(uint256 => mapping(address => string)) public deliveredKeys;
    // Track if user bought it: itemId => buyerAddress => bool
    mapping(uint256 => mapping(address => bool)) public hasPurchased;

    event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply);
    event ItemPurchased(uint256 indexed id, address indexed buyer);
    event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey);

    constructor() Ownable(msg.sender) {}

    function listItem(
        string calldata _name, 
        string calldata _ipfsCid, 
        string calldata _previewCid,
        string calldata _fileType,
        uint256 _price,
        uint256 _maxSupply
    ) external nonReentrant {
        require(_price > 0, "Price must be > 0");
        require(_maxSupply > 0, "Supply must be > 0");
        
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
            maxSupply: _maxSupply,
            soldCount: 0,
            isSoldOut: false
        }));
        
        emit ItemListed(newId, msg.sender, _price, _name, _maxSupply);
    }

    function buyItem(uint256 _id) external payable nonReentrant {
        Item storage item = items[_id];
        require(!item.isSoldOut, "Item is sold out");
        require(item.soldCount < item.maxSupply, "Max supply reached");
        require(msg.value >= item.price, "Insufficient payment");
        require(!hasPurchased[_id][msg.sender], "You already bought this");
        require(msg.sender != item.seller, "Cannot buy your own item");

        item.soldCount += 1;
        if (item.soldCount >= item.maxSupply) {
            item.isSoldOut = true;
        }
        
        hasPurchased[_id][msg.sender] = true;

        emit ItemPurchased(_id, msg.sender);
    }

    function deliverKey(uint256 _id, address _buyer, string calldata _keyForBuyer) external nonReentrant {
        Item storage item = items[_id];
        require(msg.sender == item.seller, "Only seller can deliver");
        require(hasPurchased[_id][_buyer], "User has not purchased");
        // Ensure key isn't already sent to this specific buyer
        bytes memory existingKey = bytes(deliveredKeys[_id][_buyer]);
        require(existingKey.length == 0, "Key already delivered to this buyer");

        uint256 fee = item.price / 100; 
        uint256 sellerAmount = item.price - fee;

        (bool feeSuccess, ) = owner().call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");

        (bool sellerSuccess, ) = item.seller.call{value: sellerAmount}("");
        require(sellerSuccess, "Seller transfer failed");

        deliveredKeys[_id][_buyer] = _keyForBuyer;

        emit KeyDelivered(_id, _buyer, _keyForBuyer);
    }

    function getMarketplaceItems() external view returns (Item[] memory) {
        return items;
    }

    // Helper to check if I own a specific item
    function checkOwnership(uint256 _id, address _user) external view returns (bool bought, string memory key) {
        return (hasPurchased[_id][_user], deliveredKeys[_id][_user]);
    }
}