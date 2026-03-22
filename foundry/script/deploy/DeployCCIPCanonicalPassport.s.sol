// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {CCIPRegistryPassport} from "../../src/crosschain/CCIPRegistryPassport.sol";

/// @notice Run on the **canonical** chain: deploy `CCIPRegistryPassport` and optionally `setDestination`.
/// @dev Env: `CCIP_ROUTER`, `CANONICAL_CHAIN_ID` == `block.chainid`, `DEPLOYER` = signing EOA.
///      Optional: `CCIP_DEST_CHAIN_SELECTOR` (uint64) + `CCIP_DEST_RECEIVER` (mirror receiver on peer).
contract DeployCCIPCanonicalPassport is Script {
    function run() external {
        uint256 expected = vm.envUint("CANONICAL_CHAIN_ID");
        require(block.chainid == expected, "DeployCCIPCanonicalPassport: wrong chain");

        address router = vm.envAddress("CCIP_ROUTER");
        address deployer = vm.envAddress("DEPLOYER");

        vm.startBroadcast(deployer);
        CCIPRegistryPassport passport = new CCIPRegistryPassport(router, deployer);

        if (vm.envExists("CCIP_DEST_CHAIN_SELECTOR") && vm.envExists("CCIP_DEST_RECEIVER")) {
            uint64 sel = uint64(vm.envUint("CCIP_DEST_CHAIN_SELECTOR"));
            address recv = vm.envAddress("CCIP_DEST_RECEIVER");
            passport.setDestination(sel, recv);
            console2.log("setDestination chainSelector:", uint256(sel));
            console2.log("setDestination receiver:", recv);
        } else {
            console2.log("setDestination skipped - set CCIP_DEST_CHAIN_SELECTOR + CCIP_DEST_RECEIVER to auto-configure");
        }

        vm.stopBroadcast();

        console2.log("CCIPRegistryPassport:", address(passport));
    }
}
