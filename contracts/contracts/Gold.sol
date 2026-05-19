// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Gold is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Gold", "GOLD") Ownable(initialOwner) {
        _mint(initialOwner, 100_000);
    }

    // 0 decimals — 1 Gold = 1 token, matches in-game gold amounts exactly
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // Testing faucet — anyone can claim 1000 Gold
    function faucet() external {
        _mint(msg.sender, 1000);
    }

    // Owner-only mint for controlled distribution
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
