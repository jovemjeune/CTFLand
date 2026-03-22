// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Read-only view of `Registry` for triage enrollment checks.
interface IRegistryCTF {
    function ctfCreationTime(uint256 ctfId) external view returns (uint256);
    function ctfSupportsTriage(uint256 ctfId) external view returns (bool);
}

/**
 * @title TriageNFT
 * @notice On-chain credential for **triage** on CTFLand (Security Audit / Security Bounty / hackathon tracks
 *         where triage is enabled). Off-chain, applicants must meet the platform bar (e.g. documented payouts
 *         on Immunefi, Sherlock, CodeHawks, Code4rena, Cantina — see pitch); **minting is protocol-only** after review.
 * @dev Soulbound: tokens cannot be transferred peer-to-peer (only mint or burn). Competitors use World ID +
 *      CompetitorNFT; triage uses this NFT + `Registry.isResponsible` (set by owner) for privileged actions.
 */
contract TriageNFT is ERC721, Ownable {
    uint256 private _nextId = 1;

    IRegistryCTF public registry;

    /// @dev Whether `account` has enrolled as triage for CTF `ctfId` (only for CTFs with `supportsTriage`).
    mapping(address => mapping(uint256 => bool)) public isTriageForCtf;

    error TransferNotAllowed();
    error NotTriageMember();
    error ZeroAddress();
    error RegistryNotSet();
    error CtfUnknown();
    error TriageNotSupportedForCtf();
    error UnauthorizedVerifier();

    /// @notice Backend / CRE workflow wallet allowed to mint after off-chain verification (OTP, profile checks).
    address public credentialVerifier;

    event RegistryUpdated(address indexed registry);
    event CredentialVerifierUpdated(address indexed verifier);
    event TriageMinted(address indexed to, uint256 indexed tokenId);
    event TriageRevoked(uint256 indexed tokenId);
    event TriageEnrolledCtf(address indexed triage, uint256 indexed ctfId);

    constructor(address registry_) ERC721("CTFLand Triage", "TRG") Ownable(msg.sender) {
        if (registry_ != address(0)) {
            registry = IRegistryCTF(registry_);
        }
    }

    function setRegistry(address registry_) external onlyOwner {
        if (registry_ == address(0)) revert ZeroAddress();
        registry = IRegistryCTF(registry_);
        emit RegistryUpdated(registry_);
    }

    function setCredentialVerifier(address verifier) external onlyOwner {
        credentialVerifier = verifier;
        emit CredentialVerifierUpdated(verifier);
    }

    /// @dev Soulbound: disallow transfers between non-zero addresses (mint and burn still allowed).
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert TransferNotAllowed();
        return super._update(to, tokenId, auth);
    }

    /// @notice Issue triage credential after off-chain verification (e.g. $10k+ platform history per CTFLand rules).
    function mintTriage(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 tokenId = _nextId++;
        _safeMint(to, tokenId);
        emit TriageMinted(to, tokenId);
    }

    /// @notice Mint after automated verification (CRE / Next.js verifier wallet). Same NFT as `mintTriage`.
    function mintTriageVerified(address to) external {
        if (msg.sender != credentialVerifier) revert UnauthorizedVerifier();
        if (to == address(0)) revert ZeroAddress();
        uint256 tokenId = _nextId++;
        _safeMint(to, tokenId);
        emit TriageMinted(to, tokenId);
    }

    /// @notice Revoke a credential (e.g. policy breach).
    function revoke(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
        emit TriageRevoked(tokenId);
    }

    /// @notice True if `account` holds at least one active triage NFT.
    function isTriageMember(address account) external view returns (bool) {
        return balanceOf(account) > 0;
    }

    /// @notice Caller holds triage NFT and still owns it (same pattern as Sponsor `verifyCurrentSponsor` spirit).
    function verifyTriageRole() external view returns (bool) {
        return balanceOf(msg.sender) > 0;
    }

    /// @notice Enroll as triage for a CTF that exists and has triage enabled (`supportsTriage`).
    function enrollForCtf(uint256 ctfId) external {
        if (address(registry) == address(0)) revert RegistryNotSet();
        if (balanceOf(msg.sender) == 0) revert NotTriageMember();
        if (registry.ctfCreationTime(ctfId) == 0) revert CtfUnknown();
        if (!registry.ctfSupportsTriage(ctfId)) revert TriageNotSupportedForCtf();
        isTriageForCtf[msg.sender][ctfId] = true;
        emit TriageEnrolledCtf(msg.sender, ctfId);
    }

    /// @notice `true` if caller is a triage member enrolled for this CTF and still holds an NFT.
    function verifyTriageForCtf(uint256 ctfId) external view returns (bool) {
        if (balanceOf(msg.sender) == 0) return false;
        return isTriageForCtf[msg.sender][ctfId];
    }
}
