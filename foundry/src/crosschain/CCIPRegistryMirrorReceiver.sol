// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Client} from "@chainlink/ccip/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/ccip/applications/CCIPReceiver.sol";

import {RegistryMirror} from "./RegistryMirror.sol";
import {MirrorPayloadCodec} from "./MirrorPayloadCodec.sol";

/**
 * @title CCIPRegistryMirrorReceiver
 * @notice Chainlink CCIP **receiver** on the mirror chain: the CCIP router calls `ccipReceive`, which decodes
 *         payloads from the canonical deployment and forwards to `RegistryMirror` using `message.messageId` as the
 *         deduplication key (aligned with `CrossChainMessenger` replay protection).
 * @dev Configure `allowedSourceChainSelector` + `allowedSourceSender` for each peer (e.g. Arbitrum ↔ Avalanche).
 *      On the **source** chain, build `data` with `MirrorPayloadCodec` (same as `RegistryMirror.apply*` inner args).
 */
contract CCIPRegistryMirrorReceiver is CCIPReceiver, Ownable {
    RegistryMirror public immutable registryMirror;

    mapping(uint64 => bool) public allowedSourceChainSelector;
    /// @notice Expected `abi.decode(message.sender, (address))` from that chain; `address(0)` skips sender check (unsafe).
    mapping(uint64 => address) public allowedSourceSender;

    error InvalidSourceChain();
    error InvalidSourceSender();
    error UnknownOp(uint8 op);

    event PeerUpdated(uint64 indexed sourceChainSelector, bool allowed, address peerSender);

    constructor(address ccipRouter, address registryMirror_, address initialOwner)
        CCIPReceiver(ccipRouter)
        Ownable(initialOwner)
    {
        registryMirror = RegistryMirror(registryMirror_);
    }

    function setPeer(uint64 sourceChainSelector, bool allowed, address peerSender) external onlyOwner {
        allowedSourceChainSelector[sourceChainSelector] = allowed;
        allowedSourceSender[sourceChainSelector] = peerSender;
        emit PeerUpdated(sourceChainSelector, allowed, peerSender);
    }

    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        if (!allowedSourceChainSelector[message.sourceChainSelector]) revert InvalidSourceChain();

        address decodedSender = abi.decode(message.sender, (address));
        address peer = allowedSourceSender[message.sourceChainSelector];
        if (peer != address(0) && decodedSender != peer) revert InvalidSourceSender();

        bytes32 mid = message.messageId;
        bytes memory data = message.data;

        (uint8 op, bytes memory inner) = abi.decode(data, (uint8, bytes));

        if (op == MirrorPayloadCodec.OP_CTF_CREATED) {
            (uint256 ctfId, uint256 creationTime, bool supportsTriage, address sponsor) =
                abi.decode(inner, (uint256, uint256, bool, address));
            registryMirror.applyCtfCreated(mid, ctfId, creationTime, supportsTriage, sponsor);
        } else if (op == MirrorPayloadCodec.OP_MARK_FINISHED) {
            uint256 ctfId = abi.decode(inner, (uint256));
            registryMirror.applyMarkCtfFinished(mid, ctfId);
        } else if (op == MirrorPayloadCodec.OP_RESOLVED) {
            (uint256 ctfId, uint8 kind_, bytes memory payload) = abi.decode(inner, (uint256, uint8, bytes));
            registryMirror.applyResolved(mid, ctfId, kind_, payload);
        } else {
            revert UnknownOp(op);
        }
    }
}
