// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Registry} from "../src/Registry.sol";
import {SponsorNFT} from "../src/SponsorNFT.sol";

contract SponsorNFTTest is Test {
    Registry internal registry;
    SponsorNFT internal sponsorNft;
    address internal alice = makeAddr("alice");

    function setUp() public {
        sponsorNft = new SponsorNFT(address(0));
        registry = new Registry(address(sponsorNft));
        sponsorNft.setRegistry(address(registry));
    }

    function test_becomeSponsor_mintsAndStakes() public {
        uint256 ctfId = 100;
        uint256 amount = 1 ether;
        uint256 collateral = (amount * 10) / 100;
        uint256 pay = amount + collateral;

        vm.deal(alice, pay);
        vm.prank(alice);
        uint256 tid = sponsorNft.becomeSponsorWithNativeToken{value: pay}(amount, ctfId, true);

        assertEq(sponsorNft.ownerOf(tid), alice);
        assertEq(registry.ctfStakedWei(ctfId), pay);
        vm.prank(alice);
        assertTrue(sponsorNft.verifyCurrentSponsor(ctfId));
    }

    function test_becomeSponsor_revertsOnWrongValue() public {
        vm.deal(alice, 2 ether);
        vm.prank(alice);
        vm.expectRevert(SponsorNFT.BadPayment.selector);
        sponsorNft.becomeSponsorWithNativeToken{value: 1 ether}(1 ether, 1, false);
    }
}
