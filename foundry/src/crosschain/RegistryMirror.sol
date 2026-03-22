// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {CrossChainMessenger} from "./CrossChainMessenger.sol";

/**
 * @title RegistryMirror
 * @notice **Read-model** on a secondary chain (e.g. Avalanche while canonical `Registry` lives on Arbitrum, or vice versa).
 *         Native **stakes and payouts stay on each chain**; this contract only mirrors **visibility state** so UIs and
 *         integrations see the same CTF lifecycle and outcomes after the bridge delivers a message.
 * @dev Wire your bridge **receiver** to call these `apply*` functions with a unique `messageId` per inbound message.
 *      Ordering: if messages can arrive out of order, use a sequencer, ordered channels, or stronger rules — this
 *      contract does not reorder events.
 */
contract RegistryMirror is CrossChainMessenger {
    mapping(uint256 => uint256) public ctfCreationTime;
    mapping(uint256 => bool) public ctfSupportsTriage;
    mapping(uint256 => address) public ctfSponsor;
    mapping(uint256 => bool) public ctfFinished;
    mapping(uint256 => bool) public ctfResolved;
    mapping(uint256 => uint8) public outcomeKind;
    /// @dev ABI-encoded payload aligned with `getOutcome` decoding (see below).
    mapping(uint256 => bytes) private _outcomePayload;

    error CtfAlreadyExists();
    error CtfUnknown();
    error AlreadyResolved();

    event CtfMirrored(uint256 indexed ctfId, uint256 creationTime, bool supportsTriage, address sponsor);
    event CtfFinishedMirrored(uint256 indexed ctfId);
    event ResolvedMirrored(uint256 indexed ctfId, uint8 kind);

    constructor(address initialOwner) CrossChainMessenger(initialOwner) {}

    /// @notice Same return shape as `Registry.getOutcome` for mirrored CTFs.
    function getOutcome(uint256 ctfId)
        external
        view
        returns (
            uint8 kind,
            bytes32[] memory winnerHackers,
            address[] memory winnerJudges,
            address jobWinner,
            address jobJudge
        )
    {
        kind = outcomeKind[ctfId];
        bytes memory p = _outcomePayload[ctfId];
        if (p.length == 0) return (kind, winnerHackers, winnerJudges, jobWinner, jobJudge);

        (
            bytes32[] memory hackers,
            address[] memory judges,
            address jW,
            address jJ
        ) = abi.decode(p, (bytes32[], address[], address, address));

        winnerHackers = hackers;
        winnerJudges = judges;
        jobWinner = jW;
        jobJudge = jJ;
    }

    /// @dev Mirrors `Registry._createCtf` completion on the canonical chain.
    function applyCtfCreated(
        bytes32 messageId,
        uint256 ctfId,
        uint256 creationTime,
        bool supportsTriage,
        address sponsor
    ) external onlyTrustedExecutor {
        _consumeMessage(messageId);
        if (ctfCreationTime[ctfId] != 0) revert CtfAlreadyExists();
        if (sponsor == address(0)) revert ZeroAddress();
        ctfCreationTime[ctfId] = creationTime;
        ctfSupportsTriage[ctfId] = supportsTriage;
        ctfSponsor[ctfId] = sponsor;
        emit CtfMirrored(ctfId, creationTime, supportsTriage, sponsor);
    }

    function applyMarkCtfFinished(bytes32 messageId, uint256 ctfId) external onlyTrustedExecutor {
        _consumeMessage(messageId);
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        ctfFinished[ctfId] = true;
        emit CtfFinishedMirrored(ctfId);
    }

    /**
     * @notice Mirror a resolved outcome. `payload` must be `abi.encode(hackers, judges, jobWinner, jobJudge)`
     *         as produced on the canonical chain for the given `kind` (empty arrays / zero addresses where unused).
     */
    function applyResolved(
        bytes32 messageId,
        uint256 ctfId,
        uint8 kind_,
        bytes calldata payload
    ) external onlyTrustedExecutor {
        _consumeMessage(messageId);
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        if (ctfResolved[ctfId]) revert AlreadyResolved();
        (
            bytes32[] memory hackers,
            address[] memory judges,
            address jobW,
            address jobJ
        ) = abi.decode(payload, (bytes32[], address[], address, address));

        outcomeKind[ctfId] = kind_;
        _outcomePayload[ctfId] = abi.encode(hackers, judges, jobW, jobJ);
        ctfResolved[ctfId] = true;
        emit ResolvedMirrored(ctfId, kind_);
    }
}
