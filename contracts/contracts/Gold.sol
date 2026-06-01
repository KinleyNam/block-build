// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Gold is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Gold", "GOLD") Ownable(initialOwner) {
        _mint(initialOwner, 100_000);
    }

    mapping(address => bool) private _faucetClaimed;

    // 0 decimals — 1 Gold = 1 token, matches in-game gold amounts exactly
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // One-time faucet — new players claim 400–500 Gold once per wallet
    function faucet() external {
        require(!_faucetClaimed[msg.sender], "Already claimed");
        _faucetClaimed[msg.sender] = true;
        uint256 rand   = uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, msg.sender)));
        uint256 amount = 400 + (rand % 101);
        _mint(msg.sender, amount);
    }

    // Owner-only mint for controlled distribution
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Tracks unclaimed building earnings per owner wallet
    mapping(address => uint256) public pendingOwnerEarnings;

    // Called by the game server when a worker completes a 15 s session.
    // Mints gold directly to the worker; queues owner's cut for later claim.
    function recordWorkSession(
        address worker,
        uint256 workerAmount,
        address owner,
        uint256 ownerAmount
    ) external onlyOwner {
        if (workerAmount > 0) _mint(worker, workerAmount);
        if (ownerAmount  > 0) pendingOwnerEarnings[owner] += ownerAmount;
    }

    // Building owner calls this to withdraw all accumulated earnings.
    function claimOwnerEarnings() external {
        uint256 amount = pendingOwnerEarnings[msg.sender];
        require(amount > 0, "No earnings to claim");
        pendingOwnerEarnings[msg.sender] = 0;
        _mint(msg.sender, amount);
    }
}
