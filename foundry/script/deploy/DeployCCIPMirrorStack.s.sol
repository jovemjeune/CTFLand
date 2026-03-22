// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {RegistryMirror} from "../../src/crosschain/RegistryMirror.sol";
import {CCIPRegistryMirrorReceiver} from "../../src/crosschain/CCIPRegistryMirrorReceiver.sol";

/// @notice Run on the **mirror** chain: deploy `RegistryMirror`, `CCIPRegistryMirrorReceiver`, then
///         `registryMirror.setTrustedRemoteExecutor(receiver)`.
/// @dev Env: `CCIP_ROUTER` = this chain’s CCIP router; `MIRROR_CHAIN_ID` must match `block.chainid`.
///      `DEPLOYER` = EOA that signs txs (`cast wallet address ...`); Forge script `msg.sender` is not the broadcaster.
contract DeployCCIPMirrorStack is Script {
    function run() external {
        uint256 expected = vm.envUint("MIRROR_CHAIN_ID");
        require(block.chainid == expected, "DeployCCIPMirrorStack: wrong chain");

        address router = vm.envAddress("CCIP_ROUTER");
        address deployer = vm.envAddress("DEPLOYER");

        vm.startBroadcast(deployer);
        RegistryMirror mirror = new RegistryMirror(deployer);
        CCIPRegistryMirrorReceiver receiver = new CCIPRegistryMirrorReceiver(router, address(mirror), deployer);
        mirror.setTrustedRemoteExecutor(address(receiver));
        vm.stopBroadcast();

        console2.log("RegistryMirror:", address(mirror));
        console2.log("CCIPRegistryMirrorReceiver:", address(receiver));
        console2.log("Next (canonical chain): deploy CCIPRegistryPassport, setDestination -> receiver");
        console2.log("Next (this chain): receiver.setPeer(SOURCE_CHAIN_SELECTOR, true, PASSPORT_ADDRESS)");
    }
}
