// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CrossChainMessenger
 * @notice Shared plumbing for **trusted** cross-chain relays (Chainlink CCIP, LayerZero, Wormhole, Axelar, etc.):
 *         only a designated **executor** contract on this chain may apply mirrored updates, and each bridge
 *         `messageId` is consumed once (replay protection).
 * @dev The executor is typically your **receiver** contract (e.g. `CCIPReceiver`) that the bridge calls after
 *      validating the source chain and sender — not an EOA.
 */
abstract contract CrossChainMessenger is Ownable {
    address public trustedRemoteExecutor;

    mapping(bytes32 messageId => bool) public consumedMessageIds;

    error InvalidExecutor();
    error AlreadyConsumed();
    error ZeroAddress();

    event TrustedRemoteExecutorUpdated(address indexed executor);

    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlyTrustedExecutor() {
        if (msg.sender != trustedRemoteExecutor) revert InvalidExecutor();
        _;
    }

    function setTrustedRemoteExecutor(address executor) external onlyOwner {
        if (executor == address(0)) revert ZeroAddress();
        trustedRemoteExecutor = executor;
        emit TrustedRemoteExecutorUpdated(executor);
    }

    function _consumeMessage(bytes32 messageId) internal {
        if (consumedMessageIds[messageId]) revert AlreadyConsumed();
        consumedMessageIds[messageId] = true;
    }
}
