// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProtocolTreasuryVault
 * @notice Minimal native-asset treasury for `Registry.protocolTreasury` — receives ETH/AVAX fee slices from
 *         `distributeRewards`. Owner can forward funds to a multisig or ops wallet.
 * @dev For Uniswap-based token conversion, use the full `Treasury.sol` with WETH + router instead.
 */
contract ProtocolTreasuryVault is Ownable {
    error EthSendFailed();
    error ZeroAddress();

    event Withdrawn(address indexed to, uint256 amount);

    constructor() Ownable(msg.sender) {}

    receive() external payable {}

    function withdraw(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthSendFailed();
        emit Withdrawn(to, amount);
    }
}
