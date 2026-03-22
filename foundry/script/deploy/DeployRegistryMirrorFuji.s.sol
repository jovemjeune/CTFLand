// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {RegistryMirror} from "../../src/crosschain/RegistryMirror.sol";

contract DeployRegistryMirrorFuji is Script {
    function run() external {
        uint256 expected = vm.envUint("AVALANCHE_TESTNET_CHAIN_ID");
        require(block.chainid == expected, "DeployRegistryMirrorFuji: wrong chain");

        vm.startBroadcast();
        RegistryMirror mirror = new RegistryMirror(msg.sender);
        vm.stopBroadcast();

        console2.log("RegistryMirror:", address(mirror));
    }
}
