// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ebool, e, inco, elist, ETypes} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {asBool} from "@inco/lightning/src/shared/TypeUtils.sol";

contract SealedRaid {
    using e for *;

    uint256 public constant GRID = 36;
    uint256 public constant SHARDS = 5;
    uint256 public constant WIN_TARGET = 3;

    enum Phase {
        Open,
        Raiding,
        Ended
    }

    struct Match {
        address host;
        address guest;
        uint256 stake;
        Phase phase;
        uint8 turn;
        uint8 hostScore;
        uint8 guestScore;
        uint16 foundShards;
        address winner;
        bool isPrivate;
    }

    uint256 public nextMatchId = 1;
    mapping(uint256 => Match) private matches;
    mapping(uint256 => elist) private boards;
    mapping(uint256 => mapping(uint256 => bool)) public raided;
    mapping(uint256 => mapping(uint256 => uint8)) public revealedContent;
    mapping(uint256 => bytes32) public pendingHandle;
    mapping(uint256 => uint256) public pendingPos;

    event MatchCreated(uint256 indexed id, address indexed host, uint256 stake, bool isPrivate);
    event MatchJoined(uint256 indexed id, address indexed guest);
    event PhaseChanged(uint256 indexed id, Phase phase);
    event CellRaided(uint256 indexed id, uint8 indexed byPlayer, uint256 pos, bytes32 handle);
    event CellRevealed(uint256 indexed id, uint8 indexed byPlayer, uint256 pos, bool shard);
    event MatchEnded(uint256 indexed id, address indexed winner, uint256 pot);

    function createMatch(bool isPrivate) external payable returns (uint256 id) {
        require(msg.value > 0, "stake=0");
        id = nextMatchId++;
        Match storage m = matches[id];
        m.host = msg.sender;
        m.stake = msg.value;
        m.phase = Phase.Open;
        m.isPrivate = isPrivate;
        emit MatchCreated(id, msg.sender, msg.value, isPrivate);
    }

    uint256 public constant JOIN_BUFFER = 0.015 ether;

    function joinMatch(uint256 id) external payable {
        Match storage m = matches[id];
        require(m.phase == Phase.Open, "not open");
        require(m.host != address(0), "no match");
        require(msg.sender != m.host, "self");
        require(msg.value >= m.stake + JOIN_BUFFER, "value");

        m.guest = msg.sender;

        uint256 balBefore = address(this).balance;

        bytes32 trueHandle = ebool.unwrap(e.asEbool(true));
        bytes32 falseHandle = ebool.unwrap(e.asEbool(false));
        bytes32[] memory handles = new bytes32[](GRID);
        for (uint256 i = 0; i < GRID; i++) {
            handles[i] = i < SHARDS ? trueHandle : falseHandle;
        }
        elist board = e.newEList(handles, ETypes.Bool);
        board = e.shuffle(board);
        inco.allow(elist.unwrap(board), address(this));
        boards[id] = board;

        m.phase = Phase.Raiding;
        emit MatchJoined(id, msg.sender);
        emit PhaseChanged(id, Phase.Raiding);

        uint256 spent = balBefore - address(this).balance;
        uint256 refund = msg.value - m.stake - spent;
        if (refund > 0) {
            (bool ok, ) = msg.sender.call{value: refund}("");
            require(ok, "refund");
        }
    }

    function raid(uint256 id, uint256 pos) external {
        Match storage m = matches[id];
        require(m.phase == Phase.Raiding, "phase");
        require(pendingHandle[id] == bytes32(0), "pending");
        uint8 idx = _seat(m, msg.sender);
        require(m.turn == idx, "turn");
        require(pos < GRID, "oob");
        require(!raided[id][pos], "raided");

        ebool cell = e.getEbool(boards[id], uint16(pos));
        e.reveal(cell);
        bytes32 handle = ebool.unwrap(cell);
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
        uint256 pos = pendingPos[id];
        bool shard = asBool(attestation.value);

        raided[id][pos] = true;
        revealedContent[id][pos] = shard ? 1 : 0;
        pendingHandle[id] = bytes32(0);

        if (shard) {
            if (idx == 0) m.hostScore += 1;
            else m.guestScore += 1;
            m.foundShards += 1;
        }
        emit CellRevealed(id, idx, pos, shard);

        uint8 sc = idx == 0 ? m.hostScore : m.guestScore;
        if (sc >= WIN_TARGET || m.foundShards >= SHARDS) {
            _finish(id);
        } else if (!shard) {
            m.turn = 1 - idx;
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
            address winner,
            bool isPrivate
        )
    {
        Match storage m = matches[id];
        return (
            m.host,
            m.guest,
            m.stake,
            m.phase,
            m.turn,
            m.hostScore,
            m.guestScore,
            m.winner,
            m.isPrivate
        );
    }

    function getRevealedBoard(uint256 id) external view returns (uint8[] memory out) {
        out = new uint8[](GRID);
        for (uint256 i = 0; i < GRID; i++) {
            out[i] = raided[id][i] ? revealedContent[id][i] + 1 : 0;
        }
    }

    function isRaided(uint256 id, uint256 pos) external view returns (bool) {
        return raided[id][pos];
    }
}
