// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

/// @dev Pulls `tokenIn` from `msg.sender` (Treasury) and sends `tokenOut` to `recipient`.
contract MockSwapRouter is ISwapRouter {
    uint256 public nextAmountOut;

    function setNextAmountOut(uint256 v) external {
        nextAmountOut = v;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        override
        returns (uint256 amountOut)
    {
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        require(nextAmountOut >= params.amountOutMinimum, "min");
        IERC20(params.tokenOut).transfer(params.recipient, nextAmountOut);
        return nextAmountOut;
    }

    function exactInput(ExactInputParams calldata) external payable override returns (uint256) {
        revert();
    }

    function exactOutputSingle(ExactOutputSingleParams calldata) external payable override returns (uint256) {
        revert();
    }

    function exactOutput(ExactOutputParams calldata) external payable override returns (uint256) {
        revert();
    }

    function uniswapV3SwapCallback(int256, int256, bytes calldata) external pure override {}
}
