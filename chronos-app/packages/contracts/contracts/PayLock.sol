// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PayLock {
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
    }

    // Mappings
    mapping(uint256 => Item) public items;
    // Map Item ID -> Buyer Address -> Encrypted Key
    mapping(uint256 => mapping(address => string)) public buyerKeys;
    // Map Item ID -> Buyer Address -> specific purchase status
    mapping(uint256 => mapping(address => bool)) public hasBought;

    uint256 public itemCount;

    // Events
    event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply);
    event ItemPurchased(uint256 indexed id, address indexed buyer);
    event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey);
    event ItemCanceled(uint256 indexed id, address indexed seller);

    function listItem(
        string memory _name,
        string memory _ipfsCid,
        string memory _previewCid,
        string memory _fileType,
        uint256 _price,
        uint256 _maxSupply
    ) public {
        require(_maxSupply > 0, "Supply must be > 0");

        itemCount++;
        items[itemCount] = Item(
            itemCount,
            payable(msg.sender),
            _name,
            _ipfsCid,
            _previewCid,
            _fileType,
            _price,
            _maxSupply,
            0,
            false
        );

        emit ItemListed(itemCount, msg.sender, _price, _name, _maxSupply);
    }

    function buyItem(uint256 _id) public payable {
        Item storage item = items[_id];
        require(_id > 0 && _id <= itemCount, "Item does not exist");
        require(msg.value >= item.price, "Not enough ether");
        require(!item.isSoldOut, "Item is sold out");
        require(item.soldCount < item.maxSupply, "Max supply reached");
        require(!hasBought[_id][msg.sender], "You already bought this");

        // 1. UPDATE STATE (Effects)
        // We update the contract state BEFORE sending money to prevent reentrancy attacks
        hasBought[_id][msg.sender] = true;
        item.soldCount++;

        // Auto-mark sold out if supply reached
        if (item.soldCount >= item.maxSupply) {
            item.isSoldOut = true;
        }

        // 2. SEND MONEY (Interactions)
        // Using .call is the modern, secure way to transfer Ether
        (bool success, ) = item.seller.call{value: msg.value}("");
        require(success, "Transfer to seller failed");

        emit ItemPurchased(_id, msg.sender);
    }

    function deliverKey(uint256 _id, address _buyer, string memory _keyForBuyer) public {
        Item storage item = items[_id];
        require(msg.sender == item.seller, "Only seller can deliver");
        require(hasBought[_id][_buyer], "Address did not buy this item");

        buyerKeys[_id][_buyer] = _keyForBuyer;
        
        emit KeyDelivered(_id, _buyer, _keyForBuyer);
    }

    function cancelListing(uint256 _id) public {
        Item storage item = items[_id];
        require(msg.sender == item.seller, "Only seller can cancel");
        require(!item.isSoldOut, "Already sold out");
        
        // Mark as sold out effectively cancels it
        item.isSoldOut = true;
        // Cap the supply at whatever was sold so far
        item.maxSupply = item.soldCount;

        emit ItemCanceled(_id, msg.sender);
    }

    function getMarketplaceItems() public view returns (Item[] memory) {
        Item[] memory allItems = new Item[](itemCount);
        for (uint256 i = 1; i <= itemCount; i++) {
            allItems[i - 1] = items[i];
        }
        return allItems;
    }

    function checkOwnership(uint256 _id, address _user) public view returns (bool bought, string memory key) {
        return (hasBought[_id][_user], buyerKeys[_id][_user]);
    }
}