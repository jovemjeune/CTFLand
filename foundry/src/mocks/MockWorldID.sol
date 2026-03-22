// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IWorldID} from "../worldid/IWorldID.sol";

/// @dev For testnet deploys where World ID Router is not available on-chain; `verifyProof` is a no-op.
contract MockWorldID is IWorldID {
    function verifyProof(
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256[8] calldata
    ) external pure override {}
}
