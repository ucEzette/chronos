

// Sources flattened with hardhat v2.28.0 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


// File contracts/PayLock.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;


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

    // Refund Logic Constants
    uint256 public constant DELIVERY_TIMEOUT = 24 hours;

    mapping(uint256 => Item) public items;
    // Mapping: ItemID => BuyerAddress => PurchaseDetails
    mapping(uint256 => mapping(address => Purchase)) public purchases;
    
    // Mapping: ItemID => BuyerAddress => PurchaseTimestamp (for refunds)
    mapping(uint256 => mapping(address => uint256)) public purchaseTime;

    // Events
    event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply);
    event ItemPurchased(uint256 indexed id, address indexed buyer);
    event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey);
    event ItemCanceled(uint256 indexed id, address indexed seller);
    event FeeUpdated(uint256 newFee);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event FundsReclaimed(uint256 indexed id, address indexed buyer, uint256 amount);

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

        // Set purchase timestamp for refund timeout
        purchaseTime[_id][msg.sender] = block.timestamp;

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
        
        // Remove purchase time so they cant refund anymore
        delete purchaseTime[_id][_buyer];

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

    /**
     * @dev Allows buyer to reclaim funds if seller hasn't delivered key within timeout window.
     */
    function reclaimFunds(uint256 _id) external nonReentrant {
        uint256 boughtAt = purchaseTime[_id][msg.sender];
        require(boughtAt > 0, "No active purchase found"); // Checks if bought AND not delivered (since delivery deletes time)
        require(block.timestamp > boughtAt + DELIVERY_TIMEOUT, "Wait for timeout before reclaiming");
        
        Item storage item = items[_id];
        
        // Effects
        delete purchaseTime[_id][msg.sender];
        delete purchases[_id][msg.sender]; // Reset purchase state completely
        
        // Reduce sold count to allow others to buy
        if (item.soldCount > 0) {
            item.soldCount--;
            // If it was sold out, it's not anymore
            if (item.isSoldOut && item.isActive) {
                item.isSoldOut = false;
            }
        }

        // Interaction
        (bool success, ) = payable(msg.sender).call{value: item.price}("");
        require(success, "Refund failed");

        emit FundsReclaimed(_id, msg.sender, item.price);
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
