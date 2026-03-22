// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Registry} from "../src/Registry.sol";
import {SponsorNFT} from "../src/SponsorNFT.sol";

/// @notice Pitch.md splits: without triage 85% / 14% / 1%; with triage 85% / 10% / 4% / 1%.
contract RegistryRewardsTest is Test {
    Registry internal registry;
    SponsorNFT internal sponsorNft;

    address internal sponsor = makeAddr("sponsor");
    address internal winner = makeAddr("winner");
    address internal judge = makeAddr("judge");
    address payable internal treasury = payable(makeAddr("treasury"));

    function setUp() public {
        sponsorNft = new SponsorNFT(address(0));
        registry = new Registry(address(sponsorNft));
        sponsorNft.setRegistry(address(registry));
        registry.setProtocolTreasury(treasury);
    }

    function test_distributeRewards_noTriage_85_14_1() public {
        uint256 ctfId = 1;
        uint256 amount = 1 ether;
        uint256 pay = amount + (amount * 10) / 100;

        vm.deal(sponsor, pay);
        vm.prank(sponsor);
        sponsorNft.becomeSponsorWithNativeToken{value: pay}(amount, ctfId, false);

        registry.markCtfFinished(ctfId);
        vm.warp(block.timestamp + 94 hours);

        registry.resolveSingle(ctfId, bytes32(uint256(0xabc)), judge);

        registry.setCompetitorPayee(ctfId, 0, payable(winner));

        uint256 bWinner = winner.balance;
        uint256 bJudge = judge.balance;
        uint256 bTreasury = treasury.balance;

        registry.distributeRewards(ctfId);

        assertEq(winner.balance - bWinner, (pay * 8500) / 10_000);
        assertEq(judge.balance - bJudge, (pay * 1400) / 10_000);
        assertEq(treasury.balance - bTreasury, pay - (pay * 8500) / 10_000 - (pay * 1400) / 10_000);
        assertEq(registry.ctfStakedWei(ctfId), 0);
        assertTrue(registry.rewardsDistributed(ctfId));
    }

    function test_distributeRewards_withTriage_85_10_4_1() public {
        uint256 ctfId = 2;
        address payable triage = payable(makeAddr("triage"));
        uint256 amount = 1 ether;
        uint256 pay = amount + (amount * 10) / 100;

        vm.deal(sponsor, pay);
        vm.prank(sponsor);
        sponsorNft.becomeSponsorWithNativeToken{value: pay}(amount, ctfId, true);

        registry.setTriageRecipient(ctfId, triage);
        registry.markCtfFinished(ctfId);
        vm.warp(block.timestamp + 94 hours);

        registry.resolveSingle(ctfId, bytes32(uint256(1)), judge);
        registry.setCompetitorPayee(ctfId, 0, payable(winner));

        uint256 bWinner = winner.balance;
        uint256 bJudge = judge.balance;
        uint256 bTriage = triage.balance;
        uint256 bTreasury = treasury.balance;

        registry.distributeRewards(ctfId);

        assertEq(winner.balance - bWinner, (pay * 8500) / 10_000);
        assertEq(judge.balance - bJudge, (pay * 1000) / 10_000);
        assertEq(triage.balance - bTriage, (pay * 400) / 10_000);
        assertEq(
            treasury.balance - bTreasury,
            pay - (pay * 8500) / 10_000 - (pay * 1000) / 10_000 - (pay * 400) / 10_000
        );
    }
}
