// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {CCIPRegistryMirrorReceiver} from "../../src/crosschain/CCIPRegistryMirrorReceiver.sol";

/// @notice Run on the **mirror** chain **after** `CCIPRegistryPassport` exists on canonical:
///         `receiver.setPeer(SOURCE_CHAIN_SELECTOR, true, passportAddress)`.
/// @dev Env: `MIRROR_CHAIN_ID` == `block.chainid`, `DEPLOYER`, `CCIP_REGISTRY_MIRROR_RECEIVER`,
///      `SOURCE_CHAIN_SELECTOR`, `CCIP_REGISTRY_PASSPORT` (canonical sender contract).
contract ConfigureCCIPMirrorReceiverPeer is Script {
    function run() external {
        uint256 expected = vm.envUint("MIRROR_CHAIN_ID");
        require(block.chainid == expected, "ConfigureCCIPMirrorReceiverPeer: wrong chain");

        address deployer = vm.envAddress("DEPLOYER");
        address receiverAddr = vm.envAddress("CCIP_REGISTRY_MIRROR_RECEIVER");
        uint64 sourceSel = uint64(vm.envUint("SOURCE_CHAIN_SELECTOR"));
        address passport = vm.envAddress("CCIP_REGISTRY_PASSPORT");

        vm.startBroadcast(deployer);
        CCIPRegistryMirrorReceiver(receiverAddr).setPeer(sourceSel, true, passport);
        vm.stopBroadcast();

        console2.log("setPeer sourceSelector:", uint256(sourceSel));
        console2.log("peerSender (passport):", passport);
    }
}
