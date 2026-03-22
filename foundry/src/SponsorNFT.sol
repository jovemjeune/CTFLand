// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IRegistry {
    function createCtfFromSponsor(uint256 ctfId, bool supportsTriage, address sponsor) external;

    function depositStakeEth(uint256 ctfId) external payable;
}

/// @notice Sponsor credential minted when `amount + 10% collateral` is paid; creates CTF on `Registry` and stakes ETH.
contract SponsorNFT is ERC721, Ownable, ReentrancyGuard {
    uint256 private _nextId = 1;

    IRegistry public registry;

    /// @dev Sponsor `s` is registered for CTF `c` after successful onboarding.
    mapping(address => mapping(uint256 => bool)) public isSponsorForCtf;

    /// @dev NFT token id minted for sponsor `s` for CTF `c` (used with `ownerOf` in verify).
    mapping(address => mapping(uint256 => uint256)) public sponsorCtfToken;

    error BadPayment();
    error ZeroAddress();
    error RegistryNotSet();

    event RegistryUpdated(address indexed registry);
    event SponsorOnboarded(
        address indexed sponsor, uint256 indexed ctfId, uint256 indexed tokenId, uint256 amount, uint256 collateral
    );

    constructor(address registry_) ERC721("CTFLand Sponsor", "SPON") Ownable(msg.sender) {
        if (registry_ != address(0)) {
            registry = IRegistry(registry_);
        }
    }

    function setRegistry(address registry_) external onlyOwner {
        if (registry_ == address(0)) revert ZeroAddress();
        registry = IRegistry(registry_);
        emit RegistryUpdated(registry_);
    }

    /// @notice Pay `amount + collateral` where `collateral == amount / 10` (10% of `amount`). Mints NFT, creates CTF, deposits full `msg.value` on Registry.
    /// @param amount Base stake amount (not including 10% collateral).
    /// @return tokenId New Sponsor NFT id.
    function becomeSponsorWithNativeToken(uint256 amount, uint256 ctfId, bool supportsTriage)
        external
        payable
        nonReentrant
        returns (uint256 tokenId)
    {
        if (address(registry) == address(0)) revert RegistryNotSet();
        if (amount == 0) revert BadPayment();

        uint256 collateral = (amount * 10) / 100;
        uint256 required = amount + collateral;
        if (msg.value != required) revert BadPayment();

        registry.createCtfFromSponsor(ctfId, supportsTriage, msg.sender);

        registry.depositStakeEth{value: msg.value}(ctfId);

        tokenId = _nextId++;
        _safeMint(msg.sender, tokenId);

        isSponsorForCtf[msg.sender][ctfId] = true;
        sponsorCtfToken[msg.sender][ctfId] = tokenId;

        emit SponsorOnboarded(msg.sender, ctfId, tokenId, amount, collateral);
    }

    /// @notice Returns true iff caller is recorded as sponsor for `ctfId` and still owns the minted NFT.
    function verifyCurrentSponsor(uint256 ctfId) external view returns (bool) {
        if (!isSponsorForCtf[msg.sender][ctfId]) return false;
        uint256 tid = sponsorCtfToken[msg.sender][ctfId];
        if (tid == 0) return false;
        return ownerOf(tid) == msg.sender;
    }
}
