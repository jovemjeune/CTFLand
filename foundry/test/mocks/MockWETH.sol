// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IWETH} from "../../src/interfaces/IWETH.sol";

/// @dev Minimal WETH9 for Treasury tests: deposit, withdraw, transfer, balanceOf.
contract MockWETH is IWETH {
    string public name = "Mock WETH";
    string public symbol = "WETH";
    uint8 public decimals = 18;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    receive() external payable {
        balanceOf[msg.sender] += msg.value;
    }

    function deposit() external payable override {
        balanceOf[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external override {
        balanceOf[msg.sender] -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "eth");
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function totalSupply() external pure override returns (uint256) {
        return 0;
    }
}
