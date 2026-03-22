// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Registry} from "../src/Registry.sol";
import {SponsorNFT} from "../src/SponsorNFT.sol";

/// @dev Minimal stub — Registry only calls `balanceOf` for competitor checks.
contract MockCompetitor721 {
    mapping(address => uint256) public balanceOf;

    function setBalance(address account, uint256 amount) external {
        balanceOf[account] = amount;
    }
}

contract RegistryTest is Test {
    Registry internal registry;
    SponsorNFT internal sponsorNft;
    address internal owner = address(this);
    address internal sponsor = makeAddr("sponsor");

    function setUp() public {
        sponsorNft = new SponsorNFT(address(0));
        registry = new Registry(address(sponsorNft));
        sponsorNft.setRegistry(address(registry));
    }

    function test_createCtf_owner() public {
        registry.createCtf(1, true, sponsor);
        assertEq(registry.ctfCreationTime(1) != 0, true);
        assertEq(registry.ctfSponsor(1), sponsor);
        assertTrue(registry.ctfSupportsTriage(1));
    }

    function test_resolveSingle_afterWindow() public {
        uint256 ctfId = 7;
        registry.createCtf(ctfId, false, sponsor);
        registry.markCtfFinished(ctfId);

        vm.warp(block.timestamp + 94 hours);

        // Deployer (this test contract) is Registry owner → can resolve.
        registry.resolveSingle(ctfId, bytes32(uint256(1)), makeAddr("judge"));
        assertTrue(registry.ctfResolved(ctfId));
    }

    function test_createCtfFromSponsor_onlySponsorContract() public {
        vm.expectRevert(Registry.Unauthorized.selector);
        registry.createCtfFromSponsor(2, true, sponsor);
    }

    function test_setCompetitorNFT_requiresPayeeToHoldToken() public {
        MockCompetitor721 comp = new MockCompetitor721();
        registry.setCompetitorNFT(address(comp));

        uint256 ctfId = 42;
        registry.createCtf(ctfId, false, sponsor);
        address payeeNoNft = makeAddr("payeeNoNft");
        address payeeWithNft = makeAddr("payeeWithNft");
        comp.setBalance(payeeWithNft, 1);

        vm.expectRevert(Registry.MissingCompetitorCredential.selector);
        registry.setCompetitorPayee(ctfId, 0, payable(payeeNoNft));

        registry.setCompetitorPayee(ctfId, 0, payable(payeeWithNft));
        assertEq(registry.getCompetitorPayee(ctfId, 0), payable(payeeWithNft));
    }
}
