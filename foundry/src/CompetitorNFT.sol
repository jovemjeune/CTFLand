// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IWorldID} from "./worldid/IWorldID.sol";

/**
 * @title CompetitorNFT
 * @notice ERC-721 mint gated by World ID (on-chain `verifyProof`) + sybil resistance via nullifier.
 *
 * ## Flows
 *
 * 1) **Direct (user pays gas)** — `claimWithWorldId(...)`  
 *    IDKit must use this wallet address as the **signal** so `signalHash` matches `hashToField(abi.encodePacked(to))`.
 *    Anyone may submit the tx; the ZK proof binds the claim to `to`.
 *
 * 2) **Meta-tx / gasless (relayer pays gas)** — `claimWithWorldIdFor(...)`  
 *    Recipient `to` signs an EIP-712 `Claim` (deadline + nonce + nullifier binding). A relayer submits the World ID
 *    proof and signature together. Same World ID checks apply.
 *
 * Each `nullifierHash` from World ID can mint **at most once**. `tokenId -> nullifierHash` is stored for indexing
 * (the “hash from verification” is the nullifier; it is not used as `tokenId` to keep IDs dense and URI-friendly).
 *
 * **Soulbound:** tokens cannot be transferred peer-to-peer (only mint or burn), matching triage/judge credentials.
 *
 * Deploy with your chain’s WorldIDRouter and the `externalNullifierHash` from the Developer Portal (app id + action).
 * @custom:see https://docs.world.org/world-id/idkit/onchain-verification
 */
contract CompetitorNFT is ERC721, Ownable, EIP712, ReentrancyGuard {
    using ECDSA for bytes32;

    /// @dev Orb-only credential group for on-chain verification.
    uint256 public constant GROUP_ID = 1;

    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address to,uint256 nullifierHash,uint256 deadline,uint256 nonce)");

    IWorldID public worldId;
    uint256 public externalNullifierHash;

    uint256 private _nextTokenId;
    mapping(uint256 nullifierHash => bool) public nullifierUsed;
    mapping(uint256 tokenId => uint256 nullifierHash) public tokenNullifier;

    mapping(address claimant => uint256) public nonces;

    string private _baseTokenURI;

    error NullifierAlreadyUsed();
    error InvalidSignature();
    error ExpiredDeadline();
    error InvalidNonce();
    error ZeroAddressWorldId();
    error TransferNotAllowed();

    event WorldIdConfigUpdated(address indexed worldId, uint256 externalNullifierHash);
    event CompetitorClaimed(
        address indexed to, uint256 indexed tokenId, uint256 nullifierHash, address indexed submittedBy
    );

    constructor(address worldIdRouter, uint256 externalNullifierHash_)
        ERC721("Competitor", "Hacker")
        Ownable(msg.sender)
        EIP712("CompetitorNFT", "1")
    {
        if (worldIdRouter == address(0)) revert ZeroAddressWorldId();
        worldId = IWorldID(worldIdRouter);
        externalNullifierHash = externalNullifierHash_;
    }

    // --- Admin ---

    function setWorldId(address worldIdRouter) external onlyOwner {
        if (worldIdRouter == address(0)) revert ZeroAddressWorldId();
        worldId = IWorldID(worldIdRouter);
        emit WorldIdConfigUpdated(worldIdRouter, externalNullifierHash);
    }

    function setExternalNullifierHash(uint256 externalNullifierHash_) external onlyOwner {
        externalNullifierHash = externalNullifierHash_;
        emit WorldIdConfigUpdated(address(worldId), externalNullifierHash_);
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    // --- Claims ---

    /**
     * @notice Mint after World ID verification (caller pays gas).
     * @param to Recipient; must match the **signal** used when generating the proof in IDKit.
     */
    function claimWithWorldId(
        address to,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external nonReentrant {
        _claim(to, root, nullifierHash, proof, msg.sender);
    }

    /**
     * @notice Gasless path: relayer submits World ID proof + EIP-712 signature from `to`.
     * @param signature ERC-6492 not supported here — standard 65-byte ECDSA over the typed `Claim` struct.
     */
    function claimWithWorldIdFor(
        address to,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert ExpiredDeadline();
        if (nonce != nonces[to]) revert InvalidNonce();

        bytes32 structHash = keccak256(abi.encode(CLAIM_TYPEHASH, to, nullifierHash, deadline, nonce));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);
        if (signer != to) revert InvalidSignature();

        _claim(to, root, nullifierHash, proof, msg.sender);
        nonces[to] = nonce + 1;
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // --- Views ---

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId + 1;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @dev Soulbound: no peer-to-peer transfers (mint/burn only), same pattern as `TriageNFT` / `JudgeNFT`.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert TransferNotAllowed();
        return super._update(to, tokenId, auth);
    }

    // --- Internal ---

    /// @dev World ID field hash: keccak256 input, then clear high byte to fit field (see World ID docs).
    function _hashToField(bytes memory data) internal pure returns (uint256) {
        return uint256(keccak256(data)) >> 8;
    }

    function _claim(
        address to,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof,
        address submittedBy
    ) internal {
        if (nullifierUsed[nullifierHash]) revert NullifierAlreadyUsed();

        uint256 signalHash = _hashToField(abi.encodePacked(to));

        worldId.verifyProof(root, GROUP_ID, signalHash, nullifierHash, externalNullifierHash, proof);

        nullifierUsed[nullifierHash] = true;

        uint256 tokenId = ++_nextTokenId;
        tokenNullifier[tokenId] = nullifierHash;
        _safeMint(to, tokenId);

        emit CompetitorClaimed(to, tokenId, nullifierHash, submittedBy);
    }
}
