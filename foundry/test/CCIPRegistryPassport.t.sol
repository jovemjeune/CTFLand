// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {CCIPRegistryPassport} from "../src/crosschain/CCIPRegistryPassport.sol";
import {MirrorPayloadCodec} from "../src/crosschain/MirrorPayloadCodec.sol";
import {MockCCIPRouter} from "./mocks/MockCCIPRouter.sol";

contract CCIPRegistryPassportTest is Test {
    MockCCIPRouter internal router;
    CCIPRegistryPassport internal passport;

    address internal destReceiver = makeAddr("destReceiver");

    function setUp() public {
        router = new MockCCIPRouter();
        passport = new CCIPRegistryPassport(address(router), address(this));
        passport.setDestination(12345, destReceiver);
    }

    function test_quoteSendFee_matches_router() public {
        address sp = makeAddr("sp");
        bytes memory data = MirrorPayloadCodec.encodeCtfCreated(1, block.timestamp, true, sp);
        assertEq(passport.quoteSendFee(data), router.feeWei());
    }

    function test_sendCtfCreated_returns_message_id() public {
        uint256 fee = router.feeWei();
        bytes32 id = passport.sendCtfCreated{value: fee}(1, block.timestamp, true, makeAddr("sponsor"));
        assertEq(id, router.lastMessageId());
    }

    function test_send_reverts_without_destination() public {
        CCIPRegistryPassport p = new CCIPRegistryPassport(address(router), address(this));
        vm.expectRevert(CCIPRegistryPassport.DestNotConfigured.selector);
        p.sendMarkFinished{value: 0.01 ether}(1);
    }
}
