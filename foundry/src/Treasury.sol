// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IWETH} from "./interfaces/IWETH.sol";

/// @title Treasury
/// @notice Swaps approved ERC-20s into WETH via Uniswap V3; can unwrap WETH to native ETH via `IWETH.withdraw`.
/// @dev Frontrunning/sandwich risk on public mempools for large trades — use commit–reveal, private relays, or tight `amountOutMinimum` + short deadlines.
contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    mapping(address => bool) public isTheTokenSupported;

    IWETH public immutable weth;
    ISwapRouter public immutable swapRouter;

    error sameTokenToSameTokenConversion(); // 0x5938ac0f
    error unsupportedToken(); // 0x4be7c1ab
    error zeroAddressDetected(); // 0xcfa8c0b5
    error EthSendFailed();

    event ConvertedToWeth(address indexed token, address indexed receiver, uint256 amountIn, uint256 amountOut);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event NativeTokenWithdrawn(address indexed to, uint256 amount);
    event WethUnwrapped(address indexed to, uint256 amount);

    /// @param _weth Chain WETH9
    /// @param _swapRouter Uniswap V3 `SwapRouter` (or compatible `ISwapRouter`)
    /// @param supportedTokens Initial allowlist (e.g. USDC, USDT, DAI); `weth` is allowlisted automatically
    constructor(address _weth, address _swapRouter, address[] memory supportedTokens) Ownable(msg.sender) {
        if (_weth == address(0) || _swapRouter == address(0)) revert zeroAddressDetected();
        weth = IWETH(_weth);
        swapRouter = ISwapRouter(_swapRouter);
        isTheTokenSupported[_weth] = true;
        uint256 n = supportedTokens.length;
        for (uint256 i; i < n; ++i) {
            address t = supportedTokens[i];
            if (t == address(0)) revert zeroAddressDetected();
            isTheTokenSupported[t] = true;
        }
    }

    /// @dev Required so WETH `withdraw` can send native ETH to this contract before we forward it.
    receive() external payable {}

    function setTokenSupported(address token, bool supported) external onlyOwner {
        if (token == address(0)) revert zeroAddressDetected();
        isTheTokenSupported[token] = supported;
    }

    /// @notice Pull `amountIn` of `token` from caller, swap to WETH, send WETH to `receiver`.
    /// @param fee Pool fee tier: 500 / 3000 / 10000 (must match an existing `token` / WETH pool).
    /// @param deadline Uniswap router deadline (unix seconds).
    function convertToWeth(
        address receiver,
        address token,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 fee,
        uint256 deadline
    ) external {
        address wethAddr = address(weth);
        if (receiver == address(0) || token == address(0)) revert zeroAddressDetected();
        if (token == wethAddr) revert sameTokenToSameTokenConversion();
        if (!isTheTokenSupported[token]) revert unsupportedToken();

        IERC20 erc20 = IERC20(token);
        erc20.safeTransferFrom(msg.sender, address(this), amountIn);
        erc20.forceApprove(address(swapRouter), amountIn);

        uint256 amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: token,
                tokenOut: wethAddr,
                fee: fee,
                recipient: receiver,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        erc20.forceApprove(address(swapRouter), 0);

        emit ConvertedToWeth(token, receiver, amountIn, amountOut);
    }

    /// @notice Pull WETH from caller, unwrap to native ETH, send to `to`.
    /// @dev Caller must approve this contract for `amount` WETH first.
    function unwrapWethToEth(uint256 amount, address payable to) external {
        if (to == address(0)) revert zeroAddressDetected();
        IERC20 wethErc20 = IERC20(address(weth));
        wethErc20.safeTransferFrom(msg.sender, address(this), amount);
        weth.withdraw(amount);
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthSendFailed();
        emit WethUnwrapped(to, amount);
    }

    /// @notice Unwrap WETH already held by this contract and send native ETH to `to`.
    function unwrapBalanceToEth(uint256 amount, address payable to) external onlyOwner {
        if (to == address(0)) revert zeroAddressDetected();
        weth.withdraw(amount);
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthSendFailed();
        emit WethUnwrapped(to, amount);
    }

    function withdrawNativeToken(uint256 amount, address payable to) external onlyOwner {
        if (to == address(0)) revert zeroAddressDetected();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthSendFailed();
        emit NativeTokenWithdrawn(to, amount);
    }

    function withdrawToken(address token, uint256 amount, address to) external onlyOwner {
        if (to == address(0)) revert zeroAddressDetected();
        IERC20 erc20 = IERC20(token);
        erc20.safeTransfer(to, amount);
        emit TokenWithdrawn(token, to, amount);
    }  

    function isSupportedToken(address token) external view returns (bool) {
        return isTheTokenSupported[token];
    }
}
