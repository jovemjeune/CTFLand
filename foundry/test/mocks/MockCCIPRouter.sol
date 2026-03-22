// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IRouterClient} from "@chainlink/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/ccip/libraries/Client.sol";

/// @notice Minimal CCIP router stub for unit tests.
contract MockCCIPRouter is IRouterClient {
    uint256 public feeWei = 0.01 ether;
    bytes32 public lastMessageId = bytes32(uint256(0xdead));

    function setFee(uint256 f) external {
        feeWei = f;
    }

    function getFee(uint64, Client.EVM2AnyMessage memory) external view returns (uint256) {
        return feeWei;
    }

    function ccipSend(uint64, Client.EVM2AnyMessage calldata)
        external
        payable
        returns (bytes32 messageId)
    {
        return lastMessageId;
    }

    function isChainSupported(uint64) external pure returns (bool) {
        return true;
    }
}
