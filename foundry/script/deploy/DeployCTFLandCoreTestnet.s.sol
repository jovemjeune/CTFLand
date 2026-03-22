// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {SponsorNFT} from "../../src/SponsorNFT.sol";
import {Registry} from "../../src/Registry.sol";
import {TriageNFT} from "../../src/TriageNFT.sol";
import {JudgeNFT} from "../../src/JudgeNFT.sol";
import {CompetitorNFT} from "../../src/CompetitorNFT.sol";
import {MockWorldID} from "../../src/mocks/MockWorldID.sol";

contract DeployCTFLandCoreTestnet is Script {
    error UnknownTarget(string target);
    error ChainIdMismatch(uint256 expected, uint256 actual);
    error WorldIdRouterRequired();

    function _expectedChainId(string memory target) internal view returns (uint256) {
        bytes32 t = keccak256(bytes(target));
        if (t == keccak256(bytes("avalanche_fuji"))) return vm.envUint("AVALANCHE_TESTNET_CHAIN_ID");
        if (t == keccak256(bytes("arbitrum_sepolia"))) return vm.envUint("ARBITRUM_TESTNET_CHAIN_ID");
        revert UnknownTarget(target);
    }

    function _worldIdRouter() internal returns (address router, bool isMock) {
        string memory mode = vm.envOr("WORLD_ID_MODE", string("mock"));
        if (keccak256(bytes(mode)) == keccak256(bytes("mock"))) {
            MockWorldID mock = new MockWorldID();
            return (address(mock), true);
        }
        if (keccak256(bytes(mode)) == keccak256(bytes("router"))) {
            address r = vm.envAddress("WORLD_ID_ROUTER");
            if (r == address(0)) revert WorldIdRouterRequired();
            return (r, false);
        }
        revert UnknownTarget(mode);
    }

    /// @dev Use `forge script ... --account deployer` (or `--private-key`); `vm.startBroadcast()` uses the CLI broadcaster.
    /// @dev Set `WORLD_ID_MODE=mock` (default) or `WORLD_ID_MODE=router` + `WORLD_ID_ROUTER`.
    /// @dev `WORLD_EXTERNAL_NULLIFIER_HASH` must match IDKit / World Developer Portal for your app id + action (default `1` is only OK with mock).
    function run() external {
        string memory target = vm.envString("TARGET_TESTNET");
        uint256 expectedChainId = _expectedChainId(target);
        if (block.chainid != expectedChainId) revert ChainIdMismatch(expectedChainId, block.chainid);

        vm.startBroadcast();

        SponsorNFT sponsorNft = new SponsorNFT(address(0));
        Registry registry = new Registry(address(sponsorNft));
        sponsorNft.setRegistry(address(registry));

        TriageNFT triageNft = new TriageNFT(address(registry));
        registry.setTriageNFT(address(triageNft));

        JudgeNFT judgeNft = new JudgeNFT();

        (address worldRouter, bool worldIsMock) = _worldIdRouter();
        uint256 extNull = vm.envOr("WORLD_EXTERNAL_NULLIFIER_HASH", uint256(1));
        CompetitorNFT competitorNft = new CompetitorNFT(worldRouter, extNull);
        registry.setCompetitorNFT(address(competitorNft));

        vm.stopBroadcast();

        console2.log("Target:", target);
        console2.log("Deployed SponsorNFT:", address(sponsorNft));
        console2.log("Deployed Registry:", address(registry));
        console2.log("Deployed TriageNFT:", address(triageNft));
        console2.log("Deployed JudgeNFT:", address(judgeNft));
        console2.log("World ID mode (mock=1):", worldIsMock);
        console2.log("World ID router / mock:", worldRouter);
        console2.log("Deployed CompetitorNFT:", address(competitorNft));
    }
}
