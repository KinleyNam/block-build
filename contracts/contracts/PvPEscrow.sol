// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PvPEscrow is Ownable, ReentrancyGuard {
    IERC20 public immutable gold;

    struct Escrow {
        address player1;
        address player2;
        uint256 bet;
        bool    p2Joined;
        bool    resolved;
    }

    mapping(bytes32 => Escrow) public escrows;

    event Deposited(bytes32 indexed id, address player1, uint256 bet);
    event Joined   (bytes32 indexed id, address player2);
    event Refunded (bytes32 indexed id, address to,     uint256 amount);
    event PaidOut  (bytes32 indexed id, address winner, uint256 amount);

    constructor(address _gold, address initialOwner)
        Ownable(initialOwner)
    {
        gold = IERC20(_gold);
    }

    // Player 1 locks their bet — called by challenger after approval
    function deposit(bytes32 id, uint256 amount) external nonReentrant {
        require(amount > 0,                         "Amount must be > 0");
        require(escrows[id].player1 == address(0),  "ID already used");
        require(gold.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        escrows[id] = Escrow(msg.sender, address(0), amount, false, false);
        emit Deposited(id, msg.sender, amount);
    }

    // Player 2 locks their bet — called by acceptor after approval
    function join(bytes32 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(e.player1 != address(0), "Match not found");
        require(!e.p2Joined,             "Already joined");
        require(!e.resolved,             "Match resolved");
        require(msg.sender != e.player1, "Cannot join own match");
        require(gold.transferFrom(msg.sender, address(this), e.bet), "Transfer failed");
        e.player2  = msg.sender;
        e.p2Joined = true;
        emit Joined(id, msg.sender);
    }

    // Owner (server) refunds player1 — timeout or player2 declined
    function refund(bytes32 id) external onlyOwner nonReentrant {
        Escrow storage e = escrows[id];
        require(e.player1 != address(0), "Match not found");
        require(!e.resolved,             "Already resolved");
        e.resolved = true;
        gold.transfer(e.player1, e.bet);
        emit Refunded(id, e.player1, e.bet);
    }

    // Owner (server) pays winner the full pot after match ends
    function payout(bytes32 id, address winner) external onlyOwner nonReentrant {
        Escrow storage e = escrows[id];
        require(e.p2Joined,                                "Player 2 not joined");
        require(!e.resolved,                               "Already resolved");
        require(winner == e.player1 || winner == e.player2, "Invalid winner");
        e.resolved = true;
        gold.transfer(winner, e.bet * 2);
        emit PaidOut(id, winner, e.bet * 2);
    }
}
