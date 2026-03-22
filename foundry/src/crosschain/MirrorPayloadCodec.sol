// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title MirrorPayloadCodec
 * @notice Single source of truth for `RegistryMirror` update payloads sent over CCIP (or any byte channel).
 *         Use these encodings on the **canonical** chain when building `Client.EVM2AnyMessage.data`.
 */
library MirrorPayloadCodec {
    uint8 internal constant OP_CTF_CREATED = 0;
    uint8 internal constant OP_MARK_FINISHED = 1;
    uint8 internal constant OP_RESOLVED = 2;

    function encodeCtfCreated(uint256 ctfId, uint256 creationTime, bool supportsTriage, address sponsor)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(OP_CTF_CREATED, abi.encode(ctfId, creationTime, supportsTriage, sponsor));
    }

    function encodeMarkFinished(uint256 ctfId) internal pure returns (bytes memory) {
        return abi.encode(OP_MARK_FINISHED, abi.encode(ctfId));
    }

    function encodeResolved(uint256 ctfId, uint8 kind_, bytes memory outcomeInnerPayload)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(OP_RESOLVED, abi.encode(ctfId, kind_, outcomeInnerPayload));
    }
}
