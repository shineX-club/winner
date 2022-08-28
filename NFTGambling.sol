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

error ErrInvalidRecord();
error ErrInvalidContract();
error ErrRecordLocked();
error ErrTooManyItems();
error ErrRecordExists();
error ErrConvertFailed();
error ErrInvalidArguments(string name);
error ErrCreatorCanNotJoin();
error ErrFundraisingNotStarted();
error ErrToolittleMoney();
error ErrFundraisingFinished();
error ErrNoPermission();
error ErrGamblingExpired();
error ErrGamblingFinished();
error ErrFundraisingNotCompleted();
error ErrGamblingFeeRequired();
error ErrGamblingIsProcessing();
error ErrRequestIdExists();
error ErrInsufficientFunds();
error ErrInvalidCall();

/**
 * @title OnChainRandom
 * @author storyicon
 */
contract OnChainRandom {
    uint256 private _seed;

    /**
     * @notice unsafeRandom is used to generate a random number by on-chain randomness. 
     * Please note that on-chain random is potentially manipulated by miners, and most scenarios suggest using VRF.
     * @return randomly generated number.
     */
    function _unsafeRandom() internal returns (uint256) {
    unchecked {
        _seed++;
        return uint256(keccak256(abi.encodePacked(
                blockhash(block.number - 1),
                block.difficulty,
                block.timestamp,
                block.coinbase,
                _seed,
                tx.origin
            )));
    }
    }
}

/**
 * @title OnChainRandom
 * @author storyicon
 */
contract GamblingETHStorage {
    event ETHItemAdded(uint256 indexed id, address account, uint256 amount);
    struct ETHStorageRecord {
        mapping(address => uint256) items;
        address[] addresses;
        uint256 accumulateAmount;
        bool tombstone;
    }
    struct ListETHItem {
        address account;
        uint256 amount;
    }
    mapping(uint256 => ETHStorageRecord) _ETHStorageRecords;

    /**
     * @notice getETHItem is used to get the ETHItem of the given id.
     * @param id_ gambling id
     * @param account_ account to query
     * @return amount of ETH stored in this gambling
     */
    function getETHItem(uint256 id_, address account_) public view returns (uint256) {
        return _ETHStorageRecords[id_].items[account_];
    }

    /**
     * @notice listETHItems is used to list eth items.
     * @param id_ gambling id
     * @param offset_ record offset
     * @param limit_ record limit
     */
    function listETHItems(uint256 id_, uint256 offset_, uint256 limit_) public view returns (ListETHItem[] memory)   {
        ETHStorageRecord storage record = _ETHStorageRecords[id_];
        uint256 maxPos = record.addresses.length;
        uint256 endPos = offset_ + limit_;
        endPos = endPos > maxPos ? maxPos : endPos;
        if (offset_ >= endPos) revert ErrInvalidArguments("offset");
        ListETHItem[] memory items = new ListETHItem[](endPos - offset_);
        for (uint256 i = offset_; i < endPos; i++) {
            address account = record.addresses[i];
            items[i] = ListETHItem({
                account: account,
                amount: record.items[account]
            });
        }
        return items;
    }

    /**
     * @notice _addETHItem is used to add an ETHItem to the pool.
     * @param id_ gambling id
     * @param account_ source of funds
     * @param amount_ amount of funds
     */
    function _addETHItem(uint256 id_, address account_, uint256 amount_) internal {
        if (amount_ == 0) revert ErrToolittleMoney();
        ETHStorageRecord storage record = _ETHStorageRecords[id_];
        if (record.tombstone) revert ErrInvalidRecord();
        if (record.items[account_] == 0) {
            record.addresses.push(account_);
        }
        record.items[account_] += amount_;
        record.accumulateAmount += amount_;
        emit ETHItemAdded(id_, account_, amount_);
    }

    /**
     * @notice _withdrawETHItem is used to withdraw eth from the pool.
     * @param id_ gambling id
     * @param account_ account
     */
    function _withdrawETHItem(uint256 id_, address account_) internal {
        uint256 amount = _getWithdrawableETH(id_, account_);
        if (amount == 0) revert ErrInsufficientFunds();
        _ETHStorageRecords[id_].items[account_] = 0;
        payable(account_).transfer(amount);
    }

    /**
     * @notice _getWithdrawableETH is used to get the amount of withdrawable ETH from the pool.
     * @param id_ gambling id
     * @param account_ account
     */
    function _getWithdrawableETH(uint256 id_, address account_) internal view returns (uint256) {
        ETHStorageRecord storage record = _ETHStorageRecords[id_];
        if (record.tombstone) {
            return 0;
        }
        return record.items[account_];
    }

    /**
     * @notice _clearETHItem is used to clear the eth in ETHItem.
     * @param id_ gambling id
     * @param account_ account
     */
    function _clearETHItem(uint256 id_, address account_) internal {
        ETHStorageRecord storage record = _ETHStorageRecords[id_];
        record.items[account_] = 0;
    }

    /**
     * @notice _clearETHStorageRecord is used to clear the eth in _ETHStorageRecords.
     * @param id_ gambling id
     */
    function _clearETHStorageRecord(uint256 id_) internal {
        ETHStorageRecord storage record = _ETHStorageRecords[id_];
        record.tombstone = true;
    }
}

/**
 * @title GamblingNFTStorage
 * @author storyicon
 */
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
        address owner;
        bool locked;
    }
    uint256 public MaxNFTStorageRecordItems = 5;
    mapping(uint256 => NFTStorageRecord) _NFTStorageRecords;

    /**
     * @notice getNFTStorageRecord is used to get the NFTStorageRecord of given id.
     * @param id_ gambling id
     * @return NFTStorageRecord
     */
    function getNFTStorageRecord(uint256 id_) public view returns (NFTStorageRecord memory) {
        return _NFTStorageRecords[id_];
    }

    /**
     * @notice onERC721Received is a hook function, which is the key to implementing the ERC721-gambling feature.
     * When the user calls the safeTransferFrom method to transfer the NFT to the current contract, 
     * onERC721Received will be called, and the nft storage is modified at this time.
     * data_ is required. Its value should be gamblingId with 64-chars left padding.
     * For example, if the gamblingId you want to operate is 1, 
     * then data_ should be "0x0000000000000000000000000000000000000000000000000000000000000001"
     * If you use JavaScript, you can generate it in this way:
     * ----------------
     *   '0x' + web3.utils.padLeft(web3.utils.toHex(`${gamblingId}`).substr(2), 64)
     * ----------------
     */
    function onERC721Received(
        address,
        address from_,
        uint256 tokenId_,
        bytes memory data_
    ) public override returns (bytes4) {
        if (!IERC165(msg.sender).supportsInterface(type(IERC721).interfaceId)) revert ErrInvalidContract();
        uint256 id = _toUint256(data_);
        _addNFTItem(id, from_, NFTItem({
            contractType: ContractType.ERC721,
            contractAddress: msg.sender,
            tokenId: tokenId_,
            amount: 1,
            tombstone: false
        }));
        return this.onERC721Received.selector;
    }

    /**
     * @notice onERC1155Received is a hook function, which is the key to implementing the ERC1155-gambling feature.
     * When the user calls the safeTransferFrom method to transfer the NFT to the current contract, 
     * onERC1155Received will be called, and the nft storage is modified at this time.
     * data_ is required. Its value should be gamblingId with 64-chars left padding.
     * For example, if the gamblingId you want to operate is 1, 
     * then data_ should be "0x0000000000000000000000000000000000000000000000000000000000000001"
     * If you use JavaScript, you can generate it in this way:
     * ----------------
     *   '0x' + web3.utils.padLeft(web3.utils.toHex(`${gamblingId}`).substr(2), 64)
     * ----------------
     */
    function onERC1155Received(
        address,
        address from_,
        uint256 tokenId_,
        uint256 value_,
        bytes calldata data_
    ) external override returns (bytes4) {
        if (!IERC165(msg.sender).supportsInterface(type(IERC1155).interfaceId)) revert ErrInvalidContract();
        uint256 id = _toUint256(data_);
        _addNFTItem(id, from_, NFTItem({
            contractType: ContractType.ERC1155,
            contractAddress: msg.sender,
            tokenId: tokenId_,
            amount: value_,
            tombstone: false
        }));
        return this.onERC1155Received.selector;
    }

    /**
     * @notice onERC1155BatchReceived is a hook function, which is the key to implementing the ERC1155-gambling feature.
     * When the user calls the safeBatchTransferFrom method to transfer the NFT to the current contract, 
     * onERC1155BatchReceived will be called, and the nft storage is modified at this time.
     * data_ is required. Its value should be gamblingId with 64-chars left padding.
     * For example, if the gamblingId you want to operate is 1, 
     * then data_ should be "0x0000000000000000000000000000000000000000000000000000000000000001"
     * If you use JavaScript, you can generate it in this way:
     * ----------------
     *   '0x' + web3.utils.padLeft(web3.utils.toHex(`${gamblingId}`).substr(2), 64)
     * ----------------
     */
    function onERC1155BatchReceived(
        address,
        address from_,
        uint256[] calldata ids_,
        uint256[] calldata values_,
        bytes calldata data_
    ) external override returns (bytes4) {
        if (!IERC165(msg.sender).supportsInterface(type(IERC1155).interfaceId)) revert ErrInvalidContract();
        if (ids_.length != values_.length) revert ErrInvalidArguments("ids_ and values_");
        uint256 id = _toUint256(data_);
        for (uint256 i = 0; i < ids_.length; i++) {
            _addNFTItem(id, from_, NFTItem({
                contractType: ContractType.ERC1155,
                contractAddress: msg.sender,
                tokenId: ids_[i],
                amount: values_[i],
                tombstone: false
            }));
        }
        return this.onERC1155BatchReceived.selector;
    }

    /**
     * @notice Implemented the ERC165 standard.
     */
    function supportsInterface(bytes4 interfaceId) external override pure returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId;
    }

    /**
     * @notice _addETHItem is used to add an NFTItem into the pool.
     * @param id_ gambling id
     * @param account_ account
     * @param item_ NFTItem
     */
    function _addNFTItem(uint256 id_, address account_, NFTItem memory item_) internal {
        NFTStorageRecord storage record = _NFTStorageRecords[id_];
        if (record.locked) revert ErrRecordLocked();
        if (record.owner != account_) revert ErrNoPermission();
        if (record.items.length > MaxNFTStorageRecordItems) revert ErrTooManyItems();
        record.items.push(item_);
    }

    /**
     * @notice _withdrawNFTItem is used to withdraw an NFTItem from the pool.
     * @param id_ gambling id
     * @param account_ account
     * @param index_ NFTItem index
     */
    function _withdrawNFTItem(uint256 id_, address account_, uint256 index_) internal {
        NFTStorageRecord storage record = _NFTStorageRecords[id_];
        NFTItem storage item = record.items[index_];
        if (item.tombstone) revert ErrInvalidRecord();
        item.tombstone = true;
        _transfer(item, account_);
    }

    /**
     * @notice _withdrawNFTItems is used to withdraw NFTItems from the pool.
     * @param id_ gambling id
     * @param account_ account
     */
    function _withdrawNFTItems(uint256 id_, address account_) internal {
        NFTStorageRecord storage record = _NFTStorageRecords[id_];
        bool affected = false;
        for (uint256 i = 0; i < record.items.length; i++) {
            NFTItem storage item = record.items[i];
            if (!item.tombstone) {
                affected = true;
                item.tombstone = true;
                _transfer(item, account_);
            }
        }
        if (!affected) revert ErrInvalidCall();
    }

    /**
     * @notice _createNFTStorageRecord is used to create NFTStorageRecord
     * @param id_ gambling id
     * @param account_ owner of created NFTStorageRecord
     */
    function _createNFTStorageRecord(uint256 id_, address account_) internal {
        NFTStorageRecord storage record = _NFTStorageRecords[id_];
        if (record.owner != address(0)) revert ErrRecordExists();
        record.owner = account_;
    }

    /**
     * @notice _transfer is used to transfer NFTItem to specified account.
     * @param item_ NFTItem to transfer
     * @param account_ target address
     */
    function _transfer(NFTItem storage item_, address account_) internal {
        if (item_.contractType == ContractType.ERC721) {
            IERC721(item_.contractAddress).safeTransferFrom(address(this), account_, item_.tokenId);
        } else if (item_.contractType == ContractType.ERC1155) {
            IERC1155(item_.contractAddress).safeTransferFrom(address(this), account_, item_.tokenId, item_.amount, "");
        }
    }

    /**
     * @notice convert the given bytes to number.
     * @param data_ bytes to convert
     * @return converted number
     */
    function _toUint256(bytes memory data_) internal pure returns (uint256) {
        if (data_.length < 32) revert ErrConvertFailed();
        uint256 num;
        assembly {
            num := mload(add(add(data_, 0x20), 0))
        }
        return num;
    }
}


/**
 * @title Gambling
 * @author storyicon
 */
contract Gambling is GamblingNFTStorage, GamblingETHStorage, VRFConsumerBaseV2, OnChainRandom, Ownable {

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
    // map[requestId]gamblingId
    mapping(uint256 => uint256) private _VRFRecords;

    /**
     * @notice It is used to request a random number from chainlink VRF
     * @return request id
     */
    function requestRandomWords() internal returns (uint256) {
        return _VRFCoordinator.requestRandomWords(
            _VRFConfig.keyHash,
            _VRFConfig.subscriptionId,
            _VRFConfig.requestConfirmations,
            _VRFConfig.callbackGasLimit,
            _VRFConfig.numWords
        );
    }

    /**
     * @notice fulfillRandomWords is used to receive the callback request of chainlink VRF.
     * @param requestId_ request id
     * @param randomWords random words
     */
    function fulfillRandomWords(
        uint256 requestId_, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        if (randomWords.length == 0) revert ErrInvalidArguments("randomWords");
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
    event GamblingJoined(uint256 indexed id, address account, uint256 value);
    event GamblingExited(uint256 indexed id, address account);
    event GamblingPlayed(uint256 indexed id);
    event GamblingExecuted(uint256 indexed id, uint256 entropy, address winner);
    event GamblingComissionWithdrawn(address indexed account, uint256 amount);
    event CoreConfigUpdated(CoreConfig config);
    struct GamblingConfig {
        uint256 minFundraisingAmount;
        uint256 minCounterpartyBid;
        uint256 maxCounterpartyBid;
        uint256 fundraisingStartTime;
        uint256 deadline;
        uint256 creatorWinProbability;
        bool chainRandomMode;
    }
    struct GamblingRecord {
        GamblingConfig config;
        address creator;
        address winner;
        uint256 VRFRequestId;
    }
    struct GamblingStatus {
        // basic record
        GamblingRecord record;
        // the total amount of counterparty funds
        uint256 fundraisingAmount;
        // number of counterparties.
        uint256 counterpartyCount;
        // NFT staked by the creator.
        NFTItem[] collections;
    }
    struct CoreConfig {
        // 参与者手续费抽成
        uint256 participantJoinFeeRatio;
        // 发起者胜出抽成
        uint256 creatorWinFeeRatio;
        // 参与者胜出抽成
        uint256 participantWinFeeRatio;
        // VRF费用
        uint256 gamblingExecuteFee;
    }
    
    CoreConfig internal _coreConfig = CoreConfig({
        participantJoinFeeRatio: 100,
        creatorWinFeeRatio: 100,
        participantWinFeeRatio: 3000,
        gamblingExecuteFee: 0.01 ether
    });
    // gambling storage
    uint256 internal _gamblingId;
    mapping(uint256 => GamblingRecord) private _gamblingRecords;
    // commission storage
    uint256 public commissionPool;

    /**
     * @notice setCoreConfig is used to set core config
     * @param config_ config
     */
    function setCoreConfig(CoreConfig calldata config_) external onlyOwner {
        _coreConfig = config_;
        emit CoreConfigUpdated(config_);
    }

    function getCoreConfig() public view returns (CoreConfig memory) {
        return _coreConfig;
    }

    /**
     * @notice getGamblingRecord is used to get the gamblind record.
     * @param id_ gambling id
     * @return gambling record
     */
    function getGamblingRecord(uint256 id_) public view returns (GamblingRecord memory) {
        return _gamblingRecords[id_];
    }

    /**
     * @notice getGamblingStatus is used to get the gamblind status.
     * @param id_ gambling id
     * @return gambling status
     */
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

    /**
     * @notice getGamblingCount is used to get the total amount of gambling created.
     * @return the total amount of gambling.
     */
    function getGamblingCount() public view returns (uint256) {
        return _gamblingId;
    }

    /**
     * @notice createGambling is used to create gambling.
     * @param config_ the config of gambling.
     */
    function createGambling(GamblingConfig calldata config_) external {
        if (config_.deadline <= block.timestamp) revert ErrInvalidArguments("deadline");
        if (config_.creatorWinProbability == 0 || config_.creatorWinProbability >= 10000) revert ErrInvalidArguments("creatorWinProbability");
        if (config_.minFundraisingAmount == 0) revert ErrInvalidArguments("minFundraisingAmount");
        _gamblingId++;
        _gamblingRecords[_gamblingId] = GamblingRecord({
            creator: msg.sender,
            config: config_,
            winner: address(0),
            VRFRequestId: 0
        });
        _createNFTStorageRecord(_gamblingId, msg.sender);
        emit GamblingCreated(_gamblingId, msg.sender);
    }

    /**
     * @notice joinGambling is used to join gambling.
     * @param id_ gambling id.
     */
    function joinGambling(uint256 id_, address referer) external payable {
        if (referer == msg.sender) revert ErrInvalidArguments("referer");
        GamblingRecord memory gambling = _gamblingRecords[id_];
        if (gambling.creator == msg.sender) revert ErrCreatorCanNotJoin();
        if (gambling.config.fundraisingStartTime > block.timestamp) revert ErrFundraisingNotStarted();
        if (msg.value < gambling.config.minFundraisingAmount) revert ErrToolittleMoney();
        if (gambling.config.deadline <= block.timestamp) revert ErrFundraisingFinished();
        uint256 fee = _multiplyRatio(msg.value, getCoreConfig().participantJoinFeeRatio);
        if (referer == address(0)) {
            commissionPool += fee;
        } else {
            payable(referer).transfer(fee);
        }
        uint256 value = msg.value - fee;
        _addETHItem(id_, msg.sender, value);
        emit GamblingJoined(id_, msg.sender, msg.value);
    }

    /**
     * @notice isClaimGamblingETHAllowed is used to check whether withdrawal of ETH is allowed.
     * @param id_ gambling id.
     * @return whether withdrawal of ETH is allowed
     */
    function isClaimGamblingETHAllowed(uint256 id_) public view returns (bool) {
        GamblingRecord memory gambling = _gamblingRecords[id_];
        // When the game has been successfully completed and the participants have won, 
        // the participants who have not won can use this function to refund the participation money.
        bool c0 = (gambling.winner != address(0)) && 
                  (gambling.winner != gambling.creator) && 
                  (gambling.winner != msg.sender) &&
                  (msg.sender != gambling.creator);
        // When the game has expired, any participant can withdraw their eth.
        bool c1 = _isGamblingAborted(id_) && 
                  (msg.sender != gambling.creator);
        if (c0 || c1) {
            if (_getWithdrawableETH(id_, msg.sender) > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice claimGamblingETH is used to claim gambling eth.
     * @param id_ gambling id.
     */
    function claimGamblingETH(uint256 id_) external {
        bool ok = isClaimGamblingETHAllowed(id_);
        if (ok) {
            _withdrawETHItem(id_, msg.sender);     
            return;
        }
        revert ErrInvalidCall();
    }

    /**
     * @notice isClaimGamblingNFTAllowed is used to check whether withdrawal of NFT is allowed.
     * @param id_ gambling id.
     * @return whether withdrawal of NFT is allowed
     */
    function isClaimGamblingNFTAllowed(uint256 id_) public view returns (bool) {
        GamblingRecord memory gambling = _gamblingRecords[id_];
        // When the game has been successfully completed, the winner can withdraw the NFT.
        bool s0 = (gambling.winner != address(0)) && (msg.sender == gambling.winner);
        // When the game has expired, the game creator can withdraw the NFT.
        bool s1 = _isGamblingAborted(id_) && (msg.sender == gambling.creator);
        return (s0 || s1);
    }

    /**
     * @notice claimGamblingETH is used to claim gambling NFTs.
     * @param id_ gambling id.
     */
    function claimGamblingNFTs(uint256 id_) external {
        if (isClaimGamblingNFTAllowed(id_)) {
            _withdrawNFTItems(id_, msg.sender);
            return;
        }
        revert ErrInvalidCall();
    }

    /**
     * @notice claimGamblingETH is used to claim gambling NFT.
     * @param id_ gambling id.
     * @param index_ the index of NFTItem to claim.
     */
    function claimGamblingNFT(uint256 id_, uint256 index_) external {
        _withdrawNFTItem(id_, msg.sender, index_);
    }

    /**
     * @notice _isGamblingAborted is used to check whether the gambling is aborted.
     * @param id_ gambling id.
     * @return whether the gambling is aborted.
     */
    function _isGamblingAborted(uint256 id_) internal view returns (bool) {
        GamblingRecord memory gambling = _gamblingRecords[id_];
        return (gambling.winner == address(0)) &&
                  (gambling.config.deadline < block.timestamp);
    }

    /**
     * @notice playGambling is used to start the core process of gambling.
     * @param id_ gambling id.
     */
    function playGambling(uint256 id_) external payable {
        GamblingRecord storage gambling = _gamblingRecords[id_];
        if (gambling.config.deadline <= block.timestamp) revert ErrGamblingExpired();
        if (gambling.winner != address(0)) revert ErrGamblingFinished();
        if ((gambling.creator != msg.sender) && 
            (_ETHStorageRecords[id_].accumulateAmount < gambling.config.minFundraisingAmount)) revert ErrFundraisingNotCompleted();
        if (gambling.config.chainRandomMode) {
            _execGambling(id_, _unsafeRandom());
        } else {
            if (msg.value < getCoreConfig().gamblingExecuteFee) revert ErrGamblingFeeRequired();
            if (gambling.VRFRequestId != 0) revert ErrGamblingIsProcessing();
            uint256 requestId = requestRandomWords();
            if (_VRFRecords[requestId] != 0) revert ErrRequestIdExists();
            gambling.VRFRequestId = requestId;
            _VRFRecords[requestId] = id_;
            commissionPool += msg.value;
        }
        emit GamblingPlayed(id_);
    }

    /**
     * @notice _execGambling is used to execute the gambling.
     * @param id_ gambling id.
     * @param entropy_ entropy value, which determines the final result.
     */
    function _execGambling(uint256 id_, uint256 entropy_) internal {
        GamblingRecord storage gambling = _gamblingRecords[id_];
        ETHStorageRecord storage ethRecord = _ETHStorageRecords[id_];
        if (entropy_ % 10000 < gambling.config.creatorWinProbability) { // creator win
            uint256 fee = _multiplyRatio(ethRecord.accumulateAmount, getCoreConfig().creatorWinFeeRatio);
            commissionPool += fee;
            payable(gambling.creator).transfer(ethRecord.accumulateAmount - fee);
            _clearETHStorageRecord(id_);
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
                uint256 fee = _multiplyRatio(value_, getCoreConfig().participantWinFeeRatio);
                commissionPool += fee;
                payable(gambling.creator).transfer(value_ - fee);
                _clearETHItem(id_, address_);
                gambling.winner = address_;
                emit GamblingExecuted(id_, entropy_, address_);
                return;
            }
        }
        // unreachable code
        revert ErrInvalidCall();
    }

    /**
     * @notice withdrawCommission is used to withdraw the commission stored in the contract.
     * @param account_ account to transfer.
     * @param amount_ amount to transfer.
     */
    function withdrawCommission(address account_, uint256 amount_) external onlyOwner {
        if (commissionPool < amount_) revert ErrInsufficientFunds();
        commissionPool -= amount_;
        payable(account_).transfer(amount_);
        emit GamblingComissionWithdrawn(account_, amount_);
    }

    /**
     * @notice _multiplyRatio is an approximate percent multiplication implementation.
     * @param num_ number.
     * @param ratio_ numerator, its denominator is 10000.
     */
    function _multiplyRatio(uint256 num_, uint256 ratio_) internal pure returns (uint256) {
        return ratio_ * (num_ / 10000);
    }
}
