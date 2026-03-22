// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {SponsorNFT} from "../../src/SponsorNFT.sol";
import {Registry} from "../../src/Registry.sol";
import {TriageNFT} from "../../src/TriageNFT.sol";

contract DeployCTFLandCoreArbitrumFork is Script {
    error ChainIdMismatch(uint256 expected, uint256 actual);

    function run() external {
        uint256 expectedChainId = vm.envUint("ARBITRUM_FORK_CHAIN_ID");
        if (block.chainid != expectedChainId) revert ChainIdMismatch(expectedChainId, block.chainid);

        vm.startBroadcast();

        SponsorNFT sponsorNft = new SponsorNFT(address(0));
        Registry registry = new Registry(address(sponsorNft));
        sponsorNft.setRegistry(address(registry));

        TriageNFT triageNft = new TriageNFT(address(registry));
        registry.setTriageNFT(address(triageNft));

        vm.stopBroadcast();

        console2.log("Deployed SponsorNFT:", address(sponsorNft));
        console2.log("Deployed Registry:", address(registry));
        console2.log("Deployed TriageNFT:", address(triageNft));
    }
}

