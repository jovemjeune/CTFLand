// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Registry} from "../src/Registry.sol";
import {SponsorNFT} from "../src/SponsorNFT.sol";
import {TriageNFT} from "../src/TriageNFT.sol";

contract TriageNFTTest is Test {
    Registry internal registry;
    TriageNFT internal triageNft;
    address internal triageUser = makeAddr("triage");

    function setUp() public {
        SponsorNFT sponsorNft = new SponsorNFT(address(0));
        registry = new Registry(address(sponsorNft));
        sponsorNft.setRegistry(address(registry));
        triageNft = new TriageNFT(address(registry));
        registry.setTriageNFT(address(triageNft));
        registry.createCtf(1, true, makeAddr("sp"));
    }

    function test_mint_and_soulbound() public {
        triageNft.mintTriage(triageUser);
        assertEq(triageNft.balanceOf(triageUser), 1);

        address other = makeAddr("other");
        vm.prank(triageUser);
        vm.expectRevert(TriageNFT.TransferNotAllowed.selector);
        triageNft.transferFrom(triageUser, other, 1);
    }

    function test_enrollForCtf() public {
        triageNft.mintTriage(triageUser);
        vm.prank(triageUser);
        triageNft.enrollForCtf(1);
        vm.prank(triageUser);
        assertTrue(triageNft.verifyTriageForCtf(1));
    }

    function test_mintTriageVerified_onlyVerifier() public {
        address verifier = makeAddr("verifier");
        triageNft.setCredentialVerifier(verifier);
        address applicant = makeAddr("applicant");
        vm.prank(verifier);
        triageNft.mintTriageVerified(applicant);
        assertEq(triageNft.balanceOf(applicant), 1);
    }

    function test_mintTriageVerified_revertsIfNotVerifier() public {
        address applicant = makeAddr("applicant");
        vm.prank(applicant);
        vm.expectRevert(TriageNFT.UnauthorizedVerifier.selector);
        triageNft.mintTriageVerified(applicant);
    }
}
