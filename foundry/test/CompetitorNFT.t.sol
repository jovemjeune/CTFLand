// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CompetitorNFT} from "../src/CompetitorNFT.sol";
import {MockWorldID} from "../src/mocks/MockWorldID.sol";

contract CompetitorNFTTest is Test {
    CompetitorNFT internal nft;
    MockWorldID internal worldId;
    address internal user = makeAddr("user");
    uint256 internal extNullifier = 12345;

    function setUp() public {
        worldId = new MockWorldID();
        nft = new CompetitorNFT(address(worldId), extNullifier);
    }

    function test_claimWithWorldId_mints() public {
        uint256[8] memory proof;
        uint256 nullifier = 999;

        vm.prank(user);
        nft.claimWithWorldId(user, 0, nullifier, proof);

        assertEq(nft.balanceOf(user), 1);
        assertTrue(nft.nullifierUsed(nullifier));
    }

    function test_doubleClaim_same_nullifier_reverts() public {
        uint256[8] memory proof;
        uint256 nullifier = 777;

        vm.startPrank(user);
        nft.claimWithWorldId(user, 0, nullifier, proof);
        vm.expectRevert(CompetitorNFT.NullifierAlreadyUsed.selector);
        nft.claimWithWorldId(user, 0, nullifier, proof);
        vm.stopPrank();
    }

    function test_transfer_reverts_soulbound() public {
        uint256[8] memory proof;
        uint256 nullifier = 555;
        address other = makeAddr("other");

        vm.prank(user);
        nft.claimWithWorldId(user, 0, nullifier, proof);

        vm.prank(user);
        vm.expectRevert(CompetitorNFT.TransferNotAllowed.selector);
        nft.transferFrom(user, other, 1);
    }
}

