// SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "hardhat/console.sol";

pragma solidity ^0.8.7;

contract GamblingETHStorage {
    event ETHItemAdded(uint256 indexed id, address account, uint256 amount);
    struct ETHStorageRecord {
        mapping(address => uint256) items;
        address[] addresses;
        uint256 accumulateAmount;
        bool tombstone;
    }
    mapping(uint256 => ETHStorageRecord) _ETHStorageRecords;

    function getETHItem(uint256 id_, address account_) public view returns (uint256) {
        return _ETHStorageRecords[id_].items[account_];
    }

    function addETHItem(uint256 id_, address account_, uint256 amount_) internal {
        require(amount_ > 0, "zero amount");
        ETHStorageRecord storage record = _ETHStorageRecords[id_];
        require(!record.tombstone, "invalid storage record");
        if (record.items[account_] == 0) {
            record.addresses.push(account_);
        }
        record.items[account_] += amount_;
        record.accumulateAmount += amount_;
        emit ETHItemAdded(id_, account_, amount_);
    }

    function clearETHItem(uint256 id_, address account_) internal {
        ETHStorageRecord storage record = _ETHStorageRecords[id_];
        record.items[account_] = 0;
    }

    function withdrawETHItem(uint256 id_, address account_) internal {
        ETHStorageRecord storage record = _ETHStorageRecords[id_];
        require(!record.tombstone, "invalid record");
        uint256 amount = record.items[account_];
        require(amount > 0, "amount is zero");
        record.items[account_] = 0;
        payable(account_).transfer(amount);
    }

    function clearETHStorageRecord(uint256 id_) internal {
        ETHStorageRecord storage record = _ETHStorageRecords[id_];
        record.tombstone = true;
    }
}

contract GamblingNFTStorage is IERC721Receiver, IERC1155Receiver {
    event NFTItemAdded(uint256 indexed id);
    enum ContractType {
       ERC721,
       ERC1155
    }
    struct NFTItem {
        ContractType contractType;
        address contractAddress;
        uint256 tokenId;
        uint256 amount;
        bool tombstone;
    }
    struct NFTStorageRecord {
        NFTItem[] items;
        address creator;
        bool tombstone;
    }
    uint256 public MaxNFTStorageRecordItems = 5;
    mapping(uint256 => NFTStorageRecord) _NFTStorageRecords;

    function getNFTStorageRecord(uint256 id_) public view returns (NFTStorageRecord memory) {
        return _NFTStorageRecords[id_];
    }

    function addNFTItem(uint256 id_, address account_, NFTItem memory item_) internal {
        NFTStorageRecord storage record = _NFTStorageRecords[id_];
        require(!record.tombstone, "invalid record");
        require(record.creator == account_, "not record owner");
        require(record.items.length <= MaxNFTStorageRecordItems, "too many items");
        record.items.push(item_);
    }

    function _transfer(NFTItem storage item_, address account_) internal {
        if (item_.contractType == ContractType.ERC721) {
            IERC721(item_.contractAddress).safeTransferFrom(address(this), account_, item_.tokenId);
        } else if (item_.contractType == ContractType.ERC1155) {
            IERC1155(item_.contractAddress).safeTransferFrom(address(this), account_, item_.tokenId, item_.amount, "");
        }
    }

    function withdrawNFTItem(uint256 id_, address account_, uint256 index_) internal {
        NFTStorageRecord storage record = _NFTStorageRecords[id_];
        require(!record.tombstone, "invalid record");
        NFTItem storage item = record.items[index_];
        require(!item.tombstone, "invalid item");
        item.tombstone = true;
        _transfer(item, account_);
    }

    function withdrawNFTItems(uint256 id_, address account_) internal {
        NFTStorageRecord storage record = _NFTStorageRecords[id_];
        require(!record.tombstone, "invalid record");
        record.tombstone = true;
        for (uint256 i = 0; i < record.items.length; i++) {
            NFTItem storage item = record.items[i];
            if (!item.tombstone) {
                _transfer(item, account_);
            }
        }
    }

    function createNFTStorageRecord(uint256 id_, address account_) internal {
        NFTStorageRecord storage record = _NFTStorageRecords[id_];
        require(record.creator == address(0), "record already exists");
        record.creator = account_;
    }

    function onERC721Received(
        address,
        address from_,
        uint256 tokenId_,
        bytes memory data_
    ) public override returns (bytes4) {
        require(IERC165(msg.sender).supportsInterface(type(IERC721).interfaceId), "invalid contract");
        uint256 id = toUint256(data_);
        addNFTItem(id, from_, NFTItem({
            contractType: ContractType.ERC721,
            contractAddress: msg.sender,
            tokenId: tokenId_,
            amount: 1,
            tombstone: false
        }));
        return this.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address from_,
        uint256 tokenId_,
        uint256 value_,
        bytes calldata data_
    ) external override returns (bytes4) {
        require(IERC165(msg.sender).supportsInterface(type(IERC1155).interfaceId), "invalid contract");
        uint256 id = toUint256(data_);
        addNFTItem(id, from_, NFTItem({
            contractType: ContractType.ERC1155,
            contractAddress: msg.sender,
            tokenId: tokenId_,
            amount: value_,
            tombstone: false
        }));
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address from_,
        uint256[] calldata ids_,
        uint256[] calldata values_,
        bytes calldata data_
    ) external override returns (bytes4) {
        require(IERC165(msg.sender).supportsInterface(type(IERC1155).interfaceId), "invalid contract");
        require(ids_.length == values_.length, "invalid ids and values");
        uint256 id = toUint256(data_);
        for (uint256 i = 0; i < ids_.length; i++) {
            addNFTItem(id, from_, NFTItem({
                contractType: ContractType.ERC1155,
                contractAddress: msg.sender,
                tokenId: ids_[i],
                amount: values_[i],
                tombstone: false
            }));
        }
        return this.onERC1155BatchReceived.selector;
    }

    function toUint256(bytes memory bs_) internal pure returns (uint256) {
        require(bs_.length >= 32, "uint256 convert failed");
        uint256 ret;
        assembly {
            ret := mload(add(add(bs_, 0x20), 0))
        }
        return ret;
    }

    function supportsInterface(bytes4 interfaceId) external override pure returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId;
    }
}

contract Gambling is GamblingNFTStorage, GamblingETHStorage, VRFConsumerBaseV2, Ownable {

    /***********************************|
    |                VRF                |
    |__________________________________*/

    event VRFConfigUpdated(VRFConfig config);
    struct VRFConfig {
        uint64 subscriptionId;
        bytes32 keyHash;
        uint32 callbackGasLimit;
        uint16 requestConfirmations;
        uint32 numWords;
    }
    VRFConfig private _VRFConfig;
    VRFCoordinatorV2Interface private _VRFCoordinator;
    mapping(uint256 => uint256) private _VRFRecords;

    function requestRandomWords() internal returns (uint256) {
        return _VRFCoordinator.requestRandomWords(
            _VRFConfig.keyHash,
            _VRFConfig.subscriptionId,
            _VRFConfig.requestConfirmations,
            _VRFConfig.callbackGasLimit,
            _VRFConfig.numWords
        );
    }

    function fulfillRandomWords(
        uint256 requestId_, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        require(randomWords.length > 0, "invalid random words");
        uint256 gamblingId = _VRFRecords[requestId_];
        _execGambling(gamblingId, randomWords[0]);
    }

    constructor(VRFConfig memory VRFConfig_, address VRFCoordinator_) VRFConsumerBaseV2(VRFCoordinator_) {
        _VRFConfig = VRFConfig_;
        _VRFCoordinator = VRFCoordinatorV2Interface(VRFCoordinator_);
    }

    /***********************************|
    |             Gambling              |
    |__________________________________*/

    event GamblingCreated(uint256 indexed id, address creator);
    event GamblingJoined(uint256 indexed id, address account);
    event GamblingExited(uint256 indexed id, address account);
    event GamblingPlayed(uint256 indexed id);
    event GamblingExecuted(uint256 indexed id, uint256 entropy, address winner);
    event ComissionWithdrawn(address indexed account, uint256 amount);
    struct GamblingConfig {
        uint256 minFundraisingAmount;
        uint256 minCounterpartyBid;
        uint256 maxCounterpartyBid;
        uint256 fundraisingStartTime;
        uint256 deadline;
        uint256 initiatorWinProbability;
    }
    struct GamblingRecord {
        // 基本配置
        GamblingConfig config;
        // 发起者
        address creator;
        // 胜出者
        address winner;
        // VRF RequestId
        uint256 VRFRequestId;
    }
    struct GamblingStatus {
        // 基本记录
        GamblingRecord record;
        // 对手盘资金总量
        uint256 fundraisingAmount;
        // 对手盘参与人数
        uint256 counterpartyCount;
        // 发起者押注的物品
        NFTItem[] collections;
    }

    // gambling storage
    uint256 internal _gamblingCount;
    mapping(uint256 => GamblingRecord) private _gamblingRecords;
    // commission storage
    uint256 commissionDenominator = 10;
    uint256 commissionPool;

    function getGamblingRecord(uint256 id_) public view returns (GamblingRecord memory) {
        return _gamblingRecords[id_];
    }

    function getGamblingStatus(uint256 id_) public view returns (GamblingStatus memory) {
        ETHStorageRecord storage ethStorageRecord = _ETHStorageRecords[id_];
        NFTStorageRecord storage nftStorageRecord = _NFTStorageRecords[id_];
        return GamblingStatus({
            record: getGamblingRecord(id_),
            fundraisingAmount: ethStorageRecord.accumulateAmount,
            counterpartyCount: ethStorageRecord.addresses.length,
            collections: nftStorageRecord.items
        });
    }

    function getGamblingCount() public view returns (uint256) {
        return _gamblingCount;
    }

    function createGambling(GamblingConfig calldata config_) external {
        require(config_.deadline > block.timestamp, "deadline is invalid");
        require(config_.initiatorWinProbability > 0 && config_.initiatorWinProbability < 10000, "initiatorWinProbability is invalid");
        require(config_.minFundraisingAmount > 0, "minFundraisingAmount is required");
        _gamblingCount++;
        _gamblingRecords[_gamblingCount] = GamblingRecord({
            creator: msg.sender,
            config: config_,
            winner: address(0),
            VRFRequestId: 0
        });
        createNFTStorageRecord(_gamblingCount, msg.sender);
        emit GamblingCreated(_gamblingCount, msg.sender);
    }

    function joinGambling(uint256 id_) external payable {
        GamblingRecord memory gambling = _gamblingRecords[id_];
        require(gambling.creator != msg.sender, "creator can not join");
        require(gambling.config.fundraisingStartTime <= block.timestamp, "fundraising is not started");
        require(gambling.config.minFundraisingAmount <= msg.value, "too little money");
        require(gambling.config.deadline > block.timestamp, "fundraising finished");
        addETHItem(id_, msg.sender, msg.value);
        emit GamblingJoined(id_, msg.sender);
    }

    function exitGambling(uint256 id_) external {
        GamblingRecord memory gambling = _gamblingRecords[id_];
        if (gambling.winner != address(0)) {
            if (gambling.winner != gambling.creator) {
                if (msg.sender != gambling.winner) {
                    withdrawETHItem(id_, msg.sender);     
                    return;
                }
            }
        } else {
            if (gambling.config.deadline < block.timestamp) {
                if (gambling.creator == msg.sender) {
                    withdrawNFTItems(id_, msg.sender);
                } else {
                    withdrawETHItem(id_, msg.sender);            
                }
                emit GamblingExited(id_, msg.sender);
                return;
            }
        }
        revert("invalid call");
    }

    function playGambling(uint256 id_) external {
        GamblingRecord storage gambling = _gamblingRecords[id_];
        require(gambling.creator == msg.sender, "not the initiator");
        require(gambling.config.deadline > block.timestamp, "gambling has expired");
        require(gambling.winner == address(0), "gambling already finished");
        require(gambling.VRFRequestId == 0, "gambling is processing");
        require(_ETHStorageRecords[id_].accumulateAmount >= gambling.config.minFundraisingAmount, "fundraising not completed");
        uint256 requestId = requestRandomWords();
        require(_VRFRecords[requestId] == 0, "requestId exists");
        gambling.VRFRequestId = requestId;
        _VRFRecords[requestId] = id_;
        emit GamblingPlayed(id_);
    }

    function _execGambling(uint256 id_, uint256 entropy_) internal {
        GamblingRecord storage gambling = _gamblingRecords[id_];
        ETHStorageRecord storage ethRecord = _ETHStorageRecords[id_];
        if (entropy_ % 10000 < gambling.config.initiatorWinProbability) {
            uint256 commission = ethRecord.accumulateAmount / commissionDenominator;
            commissionPool += commission;
            payable(gambling.creator).transfer(ethRecord.accumulateAmount - commission);
            clearETHStorageRecord(id_);
            withdrawNFTItems(id_, gambling.creator);
            gambling.winner = gambling.creator;
            emit GamblingExecuted(id_, entropy_, gambling.creator);
            return;
        }
        uint256 point = entropy_ % ethRecord.accumulateAmount;
        uint256 step = 0;
        for (uint256 i = 0; i < ethRecord.addresses.length; i++) {
            address address_ = ethRecord.addresses[i];
            uint256 value_ = ethRecord.items[address_];
            step += value_;
            if (point < step) {
                withdrawNFTItems(id_, address_);
                commissionPool += value_;
                clearETHItem(id_, address_);
                gambling.winner = address_;
                emit GamblingExecuted(id_, entropy_, address_);
                return;
            }
        }
        revert("unreachable code");
    }

    function withdrawCommission(address account_, uint256 amount_) external onlyOwner {
        require(commissionPool >= amount_, "pool not enough");
        commissionPool -= amount_;
        payable(account_).transfer(amount_);
        emit ComissionWithdrawn(account_, amount_);
    }
}
