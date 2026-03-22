// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {ProtocolTreasuryVault} from "../src/ProtocolTreasuryVault.sol";

contract ProtocolTreasuryVaultTest is Test {
    function test_receive_and_withdraw() public {
        ProtocolTreasuryVault v = new ProtocolTreasuryVault();
        vm.deal(address(v), 1 ether);
        address payable bob = payable(makeAddr("bob"));
        v.withdraw(bob, 1 ether);
        assertEq(bob.balance, 1 ether);
    }
}
