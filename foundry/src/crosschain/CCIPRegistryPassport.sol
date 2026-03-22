// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRouterClient} from "@chainlink/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/ccip/libraries/Client.sol";

import {MirrorPayloadCodec} from "./MirrorPayloadCodec.sol";

/**
 * @title CCIPRegistryPassport
 * @notice **CCRP** — **C**ross-**C**hain **R**egistry **P**assport: canonical-side contract that sends
 *         `RegistryMirror` updates over Chainlink **CCIP** (`ccipSend`). The mirror chain stays read-consistent
 *         with CTF lifecycle / outcomes without bridging native stake — only **state visibility** crosses.
 * @dev Deploy on your **canonical** chain. Set `destinationChainSelector` + `destinationReceiver` (your
 *      `CCIPRegistryMirrorReceiver` on the peer testnet). Fund `ccipSend` with native fee (`msg.value`) per
 *      `getFee`. Owner-only sends keep the hackathon / ops story simple; wire a bot or `Registry` later.
 */
contract CCIPRegistryPassport is Ownable {
    IRouterClient public immutable ccipRouter;

    uint64 public destinationChainSelector;
    address public destinationReceiver;

    error ZeroAddress();
    error DestNotConfigured();

    event DestinationUpdated(uint64 indexed chainSelector, address indexed receiver);
    event PassportSent(bytes32 indexed messageId, uint8 op);

    constructor(address ccipRouter_, address initialOwner) Ownable(initialOwner) {
        if (ccipRouter_ == address(0)) revert ZeroAddress();
        ccipRouter = IRouterClient(ccipRouter_);
    }

    function setDestination(uint64 chainSelector, address receiver) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        destinationChainSelector = chainSelector;
        destinationReceiver = receiver;
        emit DestinationUpdated(chainSelector, receiver);
    }

    function _message(bytes memory data) private view returns (Client.EVM2AnyMessage memory m) {
        if (destinationReceiver == address(0)) revert DestNotConfigured();
        Client.GenericExtraArgsV2 memory extraArgs = Client.GenericExtraArgsV2({
            gasLimit: 400_000,
            allowOutOfOrderExecution: true
        });
        m.receiver = abi.encode(destinationReceiver);
        m.data = data;
        m.tokenAmounts = new Client.EVMTokenAmount[](0);
        m.feeToken = address(0);
        m.extraArgs = abi.encodeWithSelector(Client.GENERIC_EXTRA_ARGS_V2_TAG, extraArgs);
    }

    /// @notice Quote native fee for an arbitrary mirror payload (`MirrorPayloadCodec` output).
    function quoteSendFee(bytes memory data) external view returns (uint256 fee) {
        Client.EVM2AnyMessage memory m = _message(data);
        return ccipRouter.getFee(destinationChainSelector, m);
    }

    function sendCtfCreated(uint256 ctfId, uint256 creationTime, bool supportsTriage, address sponsor)
        external
        payable
        onlyOwner
        returns (bytes32 messageId)
    {
        bytes memory data = MirrorPayloadCodec.encodeCtfCreated(ctfId, creationTime, supportsTriage, sponsor);
        Client.EVM2AnyMessage memory m = _message(data);
        messageId = ccipRouter.ccipSend{value: msg.value}(destinationChainSelector, m);
        emit PassportSent(messageId, 0);
    }

    function sendMarkFinished(uint256 ctfId) external payable onlyOwner returns (bytes32 messageId) {
        bytes memory data = MirrorPayloadCodec.encodeMarkFinished(ctfId);
        Client.EVM2AnyMessage memory m = _message(data);
        messageId = ccipRouter.ccipSend{value: msg.value}(destinationChainSelector, m);
        emit PassportSent(messageId, 1);
    }

    /**
     * @param outcomeInnerPayload `abi.encode(hackers, judges, jobWinner, jobJudge)` matching `Registry` outcome encoding.
     */
    function sendResolved(uint256 ctfId, uint8 kind_, bytes memory outcomeInnerPayload)
        external
        payable
        onlyOwner
        returns (bytes32 messageId)
    {
        bytes memory data = MirrorPayloadCodec.encodeResolved(ctfId, kind_, outcomeInnerPayload);
        Client.EVM2AnyMessage memory m = _message(data);
        messageId = ccipRouter.ccipSend{value: msg.value}(destinationChainSelector, m);
        emit PassportSent(messageId, 2);
    }

    receive() external payable {}
}
