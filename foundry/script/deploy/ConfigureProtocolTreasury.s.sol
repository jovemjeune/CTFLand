// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {Registry} from "../../src/Registry.sol";
import {ProtocolTreasuryVault} from "../../src/ProtocolTreasuryVault.sol";

/// @notice Deploy `ProtocolTreasuryVault` and `Registry.setProtocolTreasury` on the current chain.
/// @dev `forge script ... --rpc-url ...` with `REGISTRY_ADDRESS=0x...` in env.
contract ConfigureProtocolTreasury is Script {
    function run() external {
        address regAddr = vm.envAddress("REGISTRY_ADDRESS");

        vm.startBroadcast();
        ProtocolTreasuryVault vault = new ProtocolTreasuryVault();
        Registry(regAddr).setProtocolTreasury(payable(address(vault)));
        vm.stopBroadcast();

        console2.log("ProtocolTreasuryVault:", address(vault));
        console2.log("Registry:", regAddr);
    }
}
