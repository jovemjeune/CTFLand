// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

import {Treasury} from "../src/Treasury.sol";
import {MockWETH} from "./mocks/MockWETH.sol";
import {MockSwapRouter} from "./mocks/MockSwapRouter.sol";

contract TreasuryTest is Test {
    Treasury internal treasury;
    MockWETH internal weth;
    MockSwapRouter internal router;
    ERC20Mock internal token;
    address internal user = makeAddr("user");

    function setUp() public {
        weth = new MockWETH();
        router = new MockSwapRouter();
        token = new ERC20Mock();
        address[] memory supported = new address[](1);
        supported[0] = address(token);
        treasury = new Treasury(address(weth), address(router), supported);
    }

    function test_unsupported_token_reverts() public {
        ERC20Mock other = new ERC20Mock();
        vm.expectRevert(Treasury.unsupportedToken.selector);
        treasury.convertToWeth(user, address(other), 1, 0, 3000, block.timestamp + 1);
    }

    function test_convertToWeth_swaps() public {
        router.setNextAmountOut(2 ether);
        // Fund router with WETH output
        vm.deal(address(this), 10 ether);
        weth.deposit{value: 5 ether}();
        IERC20(address(weth)).transfer(address(router), 5 ether);

        token.mint(user, 10 ether);
        vm.prank(user);
        token.approve(address(treasury), 10 ether);

        vm.prank(user);
        treasury.convertToWeth(user, address(token), 1 ether, 1, 3000, block.timestamp + 1);

        assertEq(IERC20(address(weth)).balanceOf(user), 2 ether);
    }
}
