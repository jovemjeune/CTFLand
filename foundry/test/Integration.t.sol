// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Registry} from "../src/Registry.sol";
import {SponsorNFT} from "../src/SponsorNFT.sol";
import {TriageNFT} from "../src/TriageNFT.sol";

/// @notice End-to-end: sponsor onboards → CTF exists → owner marks finished → time passes → outcome resolved.
contract IntegrationTest is Test {
    Registry internal registry;
    SponsorNFT internal sponsorNft;
    TriageNFT internal triageNft;

    address internal sponsor = makeAddr("sponsor");
    address internal judge = makeAddr("judge");
    address internal winner = makeAddr("winner");
    address payable internal protocolTreasury = payable(makeAddr("protocolTreasury"));

    function setUp() public {
        sponsorNft = new SponsorNFT(address(0));
        registry = new Registry(address(sponsorNft));
        sponsorNft.setRegistry(address(registry));
        triageNft = new TriageNFT(address(registry));
        registry.setTriageNFT(address(triageNft));
        registry.setProtocolTreasury(protocolTreasury);
    }

    function test_full_sponsor_ctf_resolve() public {
        uint256 ctfId = 42;
        uint256 amount = 2 ether;
        uint256 pay = amount + (amount * 10) / 100;

        vm.deal(sponsor, pay);
        vm.prank(sponsor);
        sponsorNft.becomeSponsorWithNativeToken{value: pay}(amount, ctfId, false);

        assertEq(registry.ctfSponsor(ctfId), sponsor);

        registry.markCtfFinished(ctfId);
        vm.warp(block.timestamp + 94 hours);

        registry.resolveSingle(ctfId, bytes32(uint256(0xabc)), judge);

        (uint8 kind,,,,) = registry.getOutcome(ctfId);
        assertEq(kind, registry.KIND_SINGLE());
        assertTrue(registry.ctfResolved(ctfId));

        registry.setCompetitorPayee(ctfId, 0, payable(winner));
        registry.distributeRewards(ctfId);
        assertTrue(registry.rewardsDistributed(ctfId));
        assertEq(registry.ctfStakedWei(ctfId), 0);
    }
}
