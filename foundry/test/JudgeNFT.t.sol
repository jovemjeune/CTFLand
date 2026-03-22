// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {JudgeNFT} from "../src/JudgeNFT.sol";

contract JudgeNFTTest is Test {
    JudgeNFT internal nft;
    address internal owner = address(this);
    address internal judge = makeAddr("judge");

    function setUp() public {
        nft = new JudgeNFT();
    }

    function test_mint_and_soulbound() public {
        nft.mintJudge(judge);
        assertEq(nft.balanceOf(judge), 1);

        address other = makeAddr("other");
        vm.prank(judge);
        vm.expectRevert(JudgeNFT.TransferNotAllowed.selector);
        nft.transferFrom(judge, other, 1);
    }

    function test_revoke() public {
        nft.mintJudge(judge);
        nft.revoke(1);
        assertEq(nft.balanceOf(judge), 0);
    }

    function test_mintJudgeVerified_onlyVerifier() public {
        address verifier = makeAddr("verifier");
        nft.setCredentialVerifier(verifier);
        address applicant = makeAddr("applicant");
        vm.prank(verifier);
        nft.mintJudgeVerified(applicant);
        assertEq(nft.balanceOf(applicant), 1);
    }

    function test_mintJudgeVerified_revertsIfNotVerifier() public {
        address applicant = makeAddr("applicant");
        vm.prank(applicant);
        vm.expectRevert(JudgeNFT.UnauthorizedVerifier.selector);
        nft.mintJudgeVerified(applicant);
    }
}
