// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {SponsorNFT} from "../../src/SponsorNFT.sol";
import {Registry} from "../../src/Registry.sol";
import {TriageNFT} from "../../src/TriageNFT.sol";

contract DeployCTFLandCoreAvalancheFork is Script {
    error ChainIdMismatch(uint256 expected, uint256 actual);

    function run() external {
        uint256 expectedChainId = vm.envUint("AVALANCHE_FORK_CHAIN_ID");
        if (block.chainid != expectedChainId) revert ChainIdMismatch(expectedChainId, block.chainid);

        vm.startBroadcast();

        // Deploy SponsorNFT first with registry unset (circular dependency bootstrap).
        SponsorNFT sponsorNft = new SponsorNFT(address(0));

        // Registry needs a SponsorNFT address in its constructor.
        Registry registry = new Registry(address(sponsorNft));
        sponsorNft.setRegistry(address(registry));

        // Optional: triage credential collection.
        TriageNFT triageNft = new TriageNFT(address(registry));
        registry.setTriageNFT(address(triageNft));

        vm.stopBroadcast();

        console2.log("Deployed SponsorNFT:", address(sponsorNft));
        console2.log("Deployed Registry:", address(registry));
        console2.log("Deployed TriageNFT:", address(triageNft));
    }
}

