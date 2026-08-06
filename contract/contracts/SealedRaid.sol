// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {euint256, e, inco, elist, ETypes} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

contract SealedRaid {
    using e for *;

    uint256 public constant GRID = 36;
    uint256 public constant SHARDS = 5;
    uint256 public constant TRAPS = 6;

    uint256 public constant VOID = 0;
    uint256 public constant SHARD = 1;
    uint256 public constant ICE = 2;

    enum Phase {
        Open,
        Placement,
        Raiding,
        Ended
    }

    struct Match {
        address host;
        address guest;
        uint256 stake;
        Phase phase;
        uint8 turn;
        uint8 committedCount;
        uint16 foundShards;
        uint8 hostScore;
        uint8 guestScore;
        address winner;
        bool[2] committed;
    }

    uint256 public nextMatchId = 1;
    mapping(uint256 => Match) private matches;
    mapping(uint256 => mapping(uint8 => elist)) private boards;
    mapping(uint256 => mapping(uint8 => mapping(uint256 => bool))) public raided;
    mapping(uint256 => bytes32) public pendingHandle;
    mapping(uint256 => uint256) public pendingPos;

    event MatchCreated(uint256 indexed id, address indexed host, uint256 stake);
    event MatchJoined(uint256 indexed id, address indexed guest);
    event PlacementCommitted(uint256 indexed id, address indexed player, uint8 index);
    event PhaseChanged(uint256 indexed id, Phase phase);
    event CellRaided(uint256 indexed id, uint8 indexed byPlayer, uint256 pos, bytes32 handle);
    event CellRevealed(uint256 indexed id, uint8 indexed byPlayer, uint256 pos, uint256 content);
    event MatchEnded(uint256 indexed id, address indexed winner, uint256 pot);

    function createMatch() external payable returns (uint256 id) {
        require(msg.value > 0, "stake=0");
        id = nextMatchId++;
        Match storage m = matches[id];
        m.host = msg.sender;
        m.stake = msg.value;
        m.phase = Phase.Open;
        emit MatchCreated(id, msg.sender, msg.value);
    }

    function joinMatch(uint256 id) external payable {
        Match storage m = matches[id];
        require(m.phase == Phase.Open, "not open");
        require(m.host != address(0), "no match");
        require(msg.sender != m.host, "self");
        require(msg.value == m.stake, "wrong stake");
        m.guest = msg.sender;
        m.phase = Phase.Placement;
        emit MatchJoined(id, msg.sender);
        emit PhaseChanged(id, Phase.Placement);
    }

    function commitPlacement(uint256 id, bytes[] calldata cells) external payable {
        Match storage m = matches[id];
        require(m.phase == Phase.Placement, "phase");
        uint8 idx = _seat(m, msg.sender);
        require(!m.committed[idx], "committed");
        require(cells.length == GRID, "len");
        require(msg.value >= inco.getFee() * GRID, "fee");

        bytes32[] memory handles = new bytes32[](GRID);
        for (uint256 i = 0; i < GRID; i++) {
            euint256 cell = cells[i].newEuint256(msg.sender);
            e.allow(cell, address(this));
            handles[i] = euint256.unwrap(cell);
        }
        elist board = e.newEList(handles, ETypes.Uint256);
        inco.allow(elist.unwrap(board), address(this));
        boards[id][idx] = board;

        m.committed[idx] = true;
        m.committedCount += 1;
        emit PlacementCommitted(id, msg.sender, idx);

        if (m.committedCount == 2) {
            m.phase = Phase.Raiding;
            emit PhaseChanged(id, Phase.Raiding);
        }
    }

    function raid(uint256 id, uint256 pos) external {
        Match storage m = matches[id];
        require(m.phase == Phase.Raiding, "phase");
        require(pendingHandle[id] == bytes32(0), "pending");
        uint8 idx = _seat(m, msg.sender);
        require(m.turn == idx, "turn");
        require(pos < GRID, "oob");
        uint8 opp = 1 - idx;
        require(!raided[id][opp][pos], "raided");

        euint256 cell = e.getEuint256(boards[id][opp], uint16(pos));
        e.reveal(cell);
        bytes32 handle = euint256.unwrap(cell);
        pendingHandle[id] = handle;
        pendingPos[id] = pos;
        emit CellRaided(id, idx, pos, handle);
    }

    function settleRaid(
        uint256 id,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) external {
        Match storage m = matches[id];
        require(m.phase == Phase.Raiding, "phase");
        require(attestation.handle == pendingHandle[id], "stale");
        require(
            inco.incoVerifier().isValidDecryptionAttestation(attestation, signatures),
            "bad sig"
        );

        uint8 idx = m.turn;
        uint8 opp = 1 - idx;
        uint256 pos = pendingPos[id];
        uint256 content = uint256(attestation.value);

        raided[id][opp][pos] = true;
        pendingHandle[id] = bytes32(0);

        if (content == SHARD) {
            if (idx == 0) m.hostScore += 1;
            else m.guestScore += 1;
            m.foundShards += 1;
        }
        emit CellRevealed(id, idx, pos, content);

        if (m.foundShards >= SHARDS * 2) {
            _finish(id);
        } else if (content != SHARD) {
            m.turn = opp;
        }
    }

    function _finish(uint256 id) internal {
        Match storage m = matches[id];
        m.phase = Phase.Ended;
        uint256 pot = m.stake * 2;
        address winner = m.hostScore >= m.guestScore ? m.host : m.guest;
        m.winner = winner;
        (bool ok, ) = winner.call{value: pot}("");
        require(ok, "payout");
        emit PhaseChanged(id, Phase.Ended);
        emit MatchEnded(id, winner, pot);
    }

    function _seat(Match storage m, address who) internal view returns (uint8) {
        if (who == m.host) return 0;
        if (who == m.guest) return 1;
        revert("not a player");
    }

    function getMatch(uint256 id)
        external
        view
        returns (
            address host,
            address guest,
            uint256 stake,
            Phase phase,
            uint8 turn,
            uint8 hostScore,
            uint8 guestScore,
            address winner
        )
    {
        Match storage m = matches[id];
        return (m.host, m.guest, m.stake, m.phase, m.turn, m.hostScore, m.guestScore, m.winner);
    }

    function isRaided(uint256 id, uint8 player, uint256 pos) external view returns (bool) {
        return raided[id][player][pos];
    }
}
