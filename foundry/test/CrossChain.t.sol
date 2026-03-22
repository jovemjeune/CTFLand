// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {RegistryMirror} from "../src/crosschain/RegistryMirror.sol";

contract CrossChainTest is Test {
    RegistryMirror internal mirror;
    address internal executor = makeAddr("executor");

    function setUp() public {
        mirror = new RegistryMirror(address(this));
        mirror.setTrustedRemoteExecutor(executor);
    }

    function test_mirror_ctf_and_resolve() public {
        bytes32 mid1 = keccak256("m1");
        bytes32 mid2 = keccak256("m2");

        vm.prank(executor);
        mirror.applyCtfCreated(mid1, 1, block.timestamp, true, makeAddr("sponsor"));

        bytes32[] memory hackers = new bytes32[](1);
        hackers[0] = bytes32(uint256(42));
        address[] memory judges = new address[](1);
        judges[0] = makeAddr("judge");
        bytes memory inner = abi.encode(hackers, judges, address(0), address(0));

        vm.prank(executor);
        mirror.applyResolved(mid2, 1, 1, inner);

        (uint8 kind,,,,) = mirror.getOutcome(1);
        assertEq(kind, 1);
        assertTrue(mirror.ctfResolved(1));
    }

    function test_replay_messageId_reverts() public {
        bytes32 mid = keccak256("once");
        vm.startPrank(executor);
        mirror.applyCtfCreated(mid, 2, block.timestamp, false, makeAddr("sp"));
        vm.expectRevert();
        mirror.applyCtfCreated(mid, 3, block.timestamp, false, makeAddr("sp2"));
        vm.stopPrank();
    }
}
