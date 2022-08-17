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

contract ETHVaultStore {
    struct ETHVault {
        mapping(address => uint256) items;
        address[] addresses;
        uint256 amount;
    }
    mapping(uint256 => ETHVault) public _ethVaults;
    constructor() {}

    function depositETHVaultStore(uint256 id_, address owner_, uint256 amount_) internal {
        require(amount_ > 0, "amount is zero");
        ETHVault storage vault = _ethVaults[id_];
        if (vault.items[owner_] == 0) {
            vault.addresses.push(owner_);
        }
        vault.items[owner_] += amount_;
        vault.amount += amount_;
    }

    function clearETHVaultStore(uint256 id_, address account_) internal {
        ETHVault storage vault = _ethVaults[id_];
        vault.amount -= vault.items[account_];
        vault.items[account_] = 0;
    }

    function clearETHVaultStore(uint256 id_) internal {
        ETHVault storage vault = _ethVaults[id_];
        vault.amount = 0;
        for (uint256 i = 0; i < vault.addresses.length; i++) {
            vault.items[vault.addresses[i]] = 0;
        }
    }

    function withdrawETHVaultStore(uint256 id_, address owner_) internal {
        ETHVault storage vault = _ethVaults[id_];
        uint256 amount = vault.items[owner_];
        require(amount > 0, "vault amount is zero");
        vault.amount -= amount;
        vault.items[owner_] = 0;
        payable(owner_).transfer(amount);
    }
}

contract NFTVaultStore is IERC721Receiver, IERC1155Receiver {
    enum ContractType {
       ERC721,
       ERC1155
    }
    struct NFTVaultItem {
        ContractType contractType;
        address contractAddress;
        uint256 tokenId;
        uint256 amount;
    }
    struct NFTVault {
        address owner;
        bool valid;
        NFTVaultItem[] items;
    }
    mapping(uint256 => NFTVault) private _nftVaults;
    constructor() {}

    function getNFTVault(uint256 id_) external view returns (NFTVault memory) {
        return _nftVaults[id_];
    }

    function depositNFTVaultStore(uint256 id_, address owner_, NFTVaultItem memory item_) internal {
        NFTVault storage vault = _nftVaults[id_];
        require(vault.valid, "invalid vault");
        require(vault.owner == owner_, "only owner can operate");
        require(vault.items.length < 5, "vault items exceed limit");
        vault.items.push(item_);
    }
    function withdrawNFTVaultStore(uint256 id_, address account_) internal {
        NFTVault storage vault = _nftVaults[id_];
        require(vault.valid, "invalid nft vault");
        vault.valid = false;
        for (uint256 i = 0; i < vault.items.length; i++) {
            NFTVaultItem storage item = vault.items[i];
            if (item.contractType == ContractType.ERC721) {
                IERC721(item.contractAddress).safeTransferFrom(address(this), account_, item.tokenId);
            } else if (item.contractType == ContractType.ERC1155) {
                IERC1155(item.contractAddress).safeTransferFrom(address(this), account_, item.tokenId, item.amount, "");
            }
        }
    }

    function createNFTVault(uint256 id_, address owner_) internal {
        require(_nftVaults[id_].owner == address(0), "vault already exists");
        NFTVault storage item = _nftVaults[id_];
        item.owner = owner_;
        item.valid = true;
    }

    function createNFTVaultItem(
        address contractAddress_, ContractType contractType_, 
        uint256 tokenId_, uint256 amount_
        ) internal returns (NFTVaultItem memory) {
        return NFTVaultItem({
            contractAddress: contractAddress_,
            contractType: contractType_,
            tokenId: tokenId_,
            amount: amount_
        });
    }

    function toUint256(bytes memory data_) internal pure returns (uint256) {
        require(data_.length >= 32, "data_ can not convert to uint256");
        uint256 ret;
        assembly {
            ret := mload(add(add(data_, 0x20), 0))
        }
        return ret;
    }

    function onERC721Received(
        address,
        address from_,
        uint256 tokenId_,
        bytes memory data_
    ) public override returns (bytes4) {
        require(IERC165(msg.sender).supportsInterface(type(IERC721).interfaceId), "invalid contract");
        uint256 id = toUint256(data_);
        NFTVaultItem memory item = createNFTVaultItem(
            msg.sender,
            ContractType.ERC721,
            tokenId_,
            1
        );
        depositNFTVaultStore(id, from_, item);
        return this.onERC721Received.selector;
    }
    
    function onERC1155Received(
        address operator_,
        address from_,
        uint256 tokenId_,
        uint256 value_,
        bytes calldata data_
    ) external override returns (bytes4) {
        require(IERC165(msg.sender).supportsInterface(type(IERC1155).interfaceId), "invalid contract");
        uint256 id = toUint256(data_);
        NFTVaultItem memory item = createNFTVaultItem(
            msg.sender,
            ContractType.ERC1155,
            tokenId_,
            value_
        );
        depositNFTVaultStore(id, from_, item);
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator_,
        address from_,
        uint256[] calldata ids_,
        uint256[] calldata values_,
        bytes calldata data_
    ) external override returns (bytes4) {
        require(IERC165(msg.sender).supportsInterface(type(IERC1155).interfaceId), "invalid contract");
        require(ids_.length == values_.length, "invalid ids and values");
        uint256 id = toUint256(data_);
        for (uint256 i = 0; i < ids_.length; i++) {
            NFTVaultItem memory item = createNFTVaultItem(
                msg.sender,
                ContractType.ERC1155,
                id,
                values_[i]
            );
            depositNFTVaultStore(ids_[i], from_, item);
        }
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external override view returns (bool) {
        return true;
    }

}

contract NFTGambling is Ownable, ReentrancyGuard, NFTVaultStore, ETHVaultStore, VRFConsumerBaseV2 {
    event GamblingCreated(uint256 indexed id, address indexed initiator);
    event GamblingJoined(uint256 indexed id, address indexed account);
    event GamblingExited(uint256 indexed id, address indexed account);
    event GamblingPlayed(uint256 indexed id);
    event GamblingExecuted(uint256 indexed id, uint256 entropy, address indexed winner);
    event ComissionWithdrawn(uint256 amount_, address indexed account);

    // 赌局配置
    struct GamblingConfig {
        // 最小集资金额，只有在到达deadline之前募集够足够的金额，才能开始赌局
        // 必须设置
        uint256 minFundraisingAmount;
        // 最小的对手出价，如果为0，则无限制
        uint256 minCounterpartyBid;
        // 最大的对手出价，如果为0，则无限制
        uint256 maxCounterpartyBid;
        // 集资开始时间
        uint256 fundraisingStartTime;
        // 在到达deadline之前，只要筹足了minFundraisingAmount，可以随时开始；
        // 如果到达了deadline仍然没有摇奖，那么游戏结束，用户可以把钱提走，发起者也可以把NFT提走
        // 必须设置
        uint256 deadline;
        // 发起者获胜的概率，分母是10000
        // 必须设置 (0, 10000)
        uint256 initiatorWinProbability;
    }
    struct GamblingRecord {
        address initiator;
        GamblingConfig config;
        address winner;
        uint256 VRFRequestId;
    }

    // gambling storage
    uint256 private _gamblingCount;
    mapping(uint256 => GamblingRecord) private _gamblingPool;
    mapping(uint256 => uint256) _randomPool;
    // commission storage
    uint256 commissionDenominator = 10;
    uint256 commissionPool;

    function getGambling(uint256 id_) external view returns (GamblingRecord memory) {
        return _gamblingPool[id_];  
    }

    function createGambling(GamblingConfig calldata config_) external {
        require(config_.deadline > block.timestamp, "deadline is invalid");
        require(config_.initiatorWinProbability > 0 && config_.initiatorWinProbability < 10000, "initiatorWinProbability is invalid");
        require(config_.minFundraisingAmount > 0, "minFundraisingAmount is required");
        _gamblingCount++;
        _gamblingPool[_gamblingCount] = GamblingRecord({
            initiator: msg.sender,
            config: config_,
            winner: address(0),
            VRFRequestId: 0
        });
        createNFTVault(_gamblingCount, msg.sender);
        emit GamblingCreated(_gamblingCount, msg.sender);
    }

    function joinGambling(uint256 id_) external payable {
        GamblingRecord memory gambling = _gamblingPool[id_];
        require(gambling.initiator != msg.sender, "initiator can not join");
        require(gambling.config.fundraisingStartTime <= block.timestamp, "fundraising is not started");
        require(gambling.config.minFundraisingAmount <= msg.value, "too little money");
        require(gambling.config.deadline > block.timestamp, "fundraising finished");
        depositETHVaultStore(id_, msg.sender, msg.value);
        emit GamblingJoined(id_, msg.sender);
    }

    function exitGambling(uint256 id_) external {
        GamblingRecord memory gambling = _gamblingPool[id_];
        if (gambling.winner == address(0)) { // processing or not started
            require(gambling.config.deadline < block.timestamp, "gambling is raising");
        }
        // expired or finished
        if (gambling.initiator == msg.sender) {
            withdrawNFTVaultStore(id_, msg.sender);
        } else {
            withdrawETHVaultStore(id_, msg.sender);            
        }
        emit GamblingExited(id_, msg.sender);
    }

    function playGambling(uint256 id_) external {
        GamblingRecord storage gambling = _gamblingPool[id_];
        require(gambling.initiator == msg.sender, "not the initiator");
        require(gambling.config.deadline > block.timestamp, "gambling has expired");
        require(gambling.winner == address(0), "gambling already finished");
        require(gambling.VRFRequestId == 0, "gambling is processing");
        require(_ethVaults[id_].amount >= gambling.config.minFundraisingAmount, "fundraising not completed");
        uint256 requestId = requestRandomWords();
        require(_randomPool[requestId] == 0, "requestId exists");
        gambling.VRFRequestId = requestId;
        _randomPool[requestId] = id_;
        emit GamblingPlayed(id_);
    }

    function _execGambling(uint256 id_, uint256 entropy_) internal {
        GamblingRecord storage gambling = _gamblingPool[id_];
        ETHVault storage ethVault = _ethVaults[id_];
        if (entropy_ % 10000 < gambling.config.initiatorWinProbability) { // initiator win
            uint256 commission = ethVault.amount / commissionDenominator;
            commissionPool += commission;
            payable(gambling.initiator).transfer(ethVault.amount - commission);
            clearETHVaultStore(id_);
            withdrawNFTVaultStore(id_, gambling.initiator);
            gambling.winner = gambling.initiator;
            emit GamblingExecuted(id_, entropy_, gambling.initiator);
            return;
        }
        uint256 point = entropy_ % ethVault.amount;
        uint256 step = 0;
        for (uint256 i = 0; i < ethVault.addresses.length; i++) {
            address address_ = ethVault.addresses[i];
            uint256 value_ = ethVault.items[address_];
            step += value_;
            if (point < step) {
                withdrawNFTVaultStore(id_, address_);
                commissionPool += value_;
                clearETHVaultStore(id_, address_);
                gambling.winner = address_;
                emit GamblingExecuted(id_, entropy_, address_);
                return;
            }
        }
        revert("unreachable code");
    }
    
    function withdrawCommission(address account_) external onlyOwner {
        commissionPool = 0;
        payable(account_).transfer(commissionPool);
        emit ComissionWithdrawn(commissionPool, account_);
    }

    /***********************************|
    |                VRF                |
    |__________________________________*/

    event VRFConfigUpdated(VRFConfig config);
    struct VRFConfig {
        uint64 subscriptionId;
        address coordinator;
        bytes32 keyHash;
        uint32 callbackGasLimit;
        uint16 requestConfirmations;
        uint32 numWords;
    }
    VRFConfig private _VRFConfig;
    VRFCoordinatorV2Interface private _VRFCoordinator;

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
        uint256 gamblingId = _randomPool[requestId_];
        _execGambling(gamblingId, randomWords[0]);
    }

    function setVRFConfig(VRFConfig calldata VRFConfig_) external onlyOwner {
        require(_VRFConfig.coordinator == VRFConfig_.coordinator, "can not change coordinator");
        _VRFConfig = VRFConfig_;
        emit VRFConfigUpdated(VRFConfig_);
    }

    constructor(VRFConfig memory VRFConfig_) VRFConsumerBaseV2(VRFConfig_.coordinator) {
        _VRFConfig = VRFConfig_;
        _VRFCoordinator = VRFCoordinatorV2Interface(VRFConfig_.coordinator);
    }
}
