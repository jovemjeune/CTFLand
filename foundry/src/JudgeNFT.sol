// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title JudgeNFT
 * @notice On-chain credential for **judges** on CTFLand (per pitch: verified findings on Immunefi,
 *         Sherlock, CodeHawks, Code4rena, Cantina). Minting is protocol-only after off-chain review.
 * @dev Soulbound: tokens cannot be transferred peer-to-peer (only mint or burn). Same binding model as
 *      `TriageNFT` and `CompetitorNFT`.
 */
contract JudgeNFT is ERC721, Ownable {
    uint256 private _nextId = 1;

    /// @notice Backend / CRE workflow wallet allowed to mint after off-chain verification.
    address public credentialVerifier;

    error TransferNotAllowed();
    error ZeroAddress();
    error UnauthorizedVerifier();

    event CredentialVerifierUpdated(address indexed verifier);
    event JudgeMinted(address indexed to, uint256 indexed tokenId);
    event JudgeRevoked(uint256 indexed tokenId);

    constructor() ERC721("CTFLand Judge", "JUD") Ownable(msg.sender) {}

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

    /// @notice Issue judge credential after off-chain verification (platform bar per CTFLand rules).
    function mintJudge(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 tokenId = _nextId++;
        _safeMint(to, tokenId);
        emit JudgeMinted(to, tokenId);
    }

    /// @notice Mint after automated verification (CRE / Next.js verifier wallet).
    function mintJudgeVerified(address to) external {
        if (msg.sender != credentialVerifier) revert UnauthorizedVerifier();
        if (to == address(0)) revert ZeroAddress();
        uint256 tokenId = _nextId++;
        _safeMint(to, tokenId);
        emit JudgeMinted(to, tokenId);
    }

    /// @notice Revoke a credential (e.g. policy breach).
    function revoke(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
        emit JudgeRevoked(tokenId);
    }

    /// @notice True if `account` holds at least one active judge NFT.
    function isJudgeMember(address account) external view returns (bool) {
        return balanceOf(account) > 0;
    }
}
