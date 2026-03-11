/**
 * reversi.js
 * Pure game logic for Reversi (Othello). Supports 2–4 players.
 * No DOM dependencies — all state is plain data.
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Player IDs. BLACK/WHITE are aliases for P1/P2 (2-player mode). */
const PLAYER = Object.freeze({
  NONE:  0,
  P1:    1,
  P2:    2,
  P3:    3,
  P4:    4,
  BLACK: 1,
  WHITE: 2,
});

const DEFAULT_BOARD_SIZE   = 8;
const MIN_BOARD_SIZE       = 4;
const MAX_BOARD_SIZE       = 32;
const DEFAULT_NUM_PLAYERS  = 2;
const MIN_NUM_PLAYERS      = 2;
const MAX_NUM_PLAYERS      = 4;

const DIRECTIONS = Object.freeze([
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
]);

// ---------------------------------------------------------------------------
// Board helpers
// ---------------------------------------------------------------------------

/**
 * Create a fresh N×N board with the opening position for numPlayers players.
 * @param {number} size
 * @param {number} numPlayers - 2, 3, or 4
 * @returns {number[][]}
 */
function createInitialBoard(size, numPlayers) {
  const board = Array.from({ length: size }, () => new Array(size).fill(PLAYER.NONE));
  const m = size / 2;

  if (numPlayers === 2) {
    // Standard Othello opening
    board[m - 1][m - 1] = PLAYER.P2;
    board[m - 1][m]     = PLAYER.P1;
    board[m][m - 1]     = PLAYER.P1;
    board[m][m]         = PLAYER.P2;
  } else if (numPlayers === 3) {
    // P1 gets two corners so everyone has reachable valid moves
    board[m - 1][m - 1] = PLAYER.P1;
    board[m - 1][m]     = PLAYER.P2;
    board[m][m - 1]     = PLAYER.P3;
    board[m][m]         = PLAYER.P1;
  } else {
    // 4 players — one piece each in the 2×2 centre
    board[m - 1][m - 1] = PLAYER.P1;
    board[m - 1][m]     = PLAYER.P2;
    board[m][m - 1]     = PLAYER.P3;
    board[m][m]         = PLAYER.P4;
  }

  return board;
}

/** Deep-copy a board. */
function cloneBoard(board) {
  return board.map(row => row.slice());
}

/** True when (row, col) is inside an N×N board. */
function inBounds(row, col, size) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

// ---------------------------------------------------------------------------
// Rule engine
// ---------------------------------------------------------------------------

/**
 * Collect all pieces that would be flipped if `player` places at (row, col).
 * Any non-own piece can be flipped — works identically for 2–4 players.
 *
 * @param {number[][]} board
 * @param {number} row
 * @param {number} col
 * @param {number} player
 * @returns {Array<[number, number]>}
 */
function getFlips(board, row, col, player) {
  if (board[row][col] !== PLAYER.NONE) return [];

  const size  = board.length;
  const flips = [];

  for (const [dr, dc] of DIRECTIONS) {
    const line = [];
    let r = row + dr;
    let c = col + dc;

    // Walk collecting non-own pieces
    while (inBounds(r, c, size) && board[r][c] !== PLAYER.NONE && board[r][c] !== player) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }

    // Valid only when the run ends at one of the current player's own pieces
    if (line.length > 0 && inBounds(r, c, size) && board[r][c] === player) {
      flips.push(...line);
    }
  }

  return flips;
}

/** @returns {boolean} */
function isValidMove(board, row, col, player) {
  return getFlips(board, row, col, player).length > 0;
}

/** @returns {Array<[number, number]>} */
function getValidMoves(board, player) {
  const size  = board.length;
  const moves = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isValidMove(board, r, c, player)) moves.push([r, c]);
    }
  }
  return moves;
}

/**
 * Apply a move in-place and return the mutated board.
 * @param {number[][]} board
 */
function applyMove(board, row, col, player) {
  const flips = getFlips(board, row, col, player);
  board[row][col] = player;
  for (const [r, c] of flips) board[r][c] = player;
  return board;
}

/**
 * Count pieces for every player on the board.
 * @param {number[][]} board
 * @returns {Object.<number, number>}  playerId → count
 */
function countPieces(board) {
  const counts = {};
  for (const row of board) {
    for (const cell of row) {
      if (cell !== PLAYER.NONE) counts[cell] = (counts[cell] ?? 0) + 1;
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Game state machine
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GameState
 * @property {number[][]}             board          - Current board
 * @property {number}                 size           - Board side length
 * @property {number}                 numPlayers     - 2, 3, or 4
 * @property {number}                 currentPlayer  - Whose turn it is
 * @property {boolean}                gameOver
 * @property {number|null}            winner         - Winning player or null (draw)
 * @property {Array<[number,number]>} validMoves     - Legal moves for currentPlayer
 * @property {number[]}               passedPlayers  - Players skipped this turn
 */

/**
 * @param {number} [size=DEFAULT_BOARD_SIZE]
 * @param {number} [numPlayers=DEFAULT_NUM_PLAYERS]
 * @returns {GameState}
 */
function createGameState(size = DEFAULT_BOARD_SIZE, numPlayers = DEFAULT_NUM_PLAYERS) {
  const board      = createInitialBoard(size, numPlayers);
  const validMoves = getValidMoves(board, PLAYER.P1);
  return {
    board,
    size,
    numPlayers,
    currentPlayer: PLAYER.P1,
    gameOver:      false,
    winner:        null,
    validMoves,
    passedPlayers: [],
  };
}

/**
 * Advance the game by placing a piece at (row, col).
 * Returns a new GameState; the original is not mutated.
 *
 * @param {GameState} state
 * @param {number} row
 * @param {number} col
 * @returns {GameState}
 */
function placePiece(state, row, col) {
  if (state.gameOver) return state;
  if (!isValidMove(state.board, row, col, state.currentPlayer)) return state;

  const newBoard = applyMove(cloneBoard(state.board), row, col, state.currentPlayer);
  return resolveNextTurn(newBoard, state.currentPlayer, state.size, state.numPlayers);
}

/**
 * Determine the next active player, handling multi-player passes and game-over.
 *
 * Iterates through all players in turn order starting just after lastPlayer.
 * Players with no valid moves are collected in passedPlayers and skipped.
 * If nobody can move the game ends.
 *
 * @param {number[][]} board
 * @param {number} lastPlayer
 * @param {number} size
 * @param {number} numPlayers
 * @returns {GameState}
 */
function resolveNextTurn(board, lastPlayer, size, numPlayers) {
  const passedPlayers = [];

  // Check each player in turn order (wraps around back to lastPlayer)
  let candidate = lastPlayer % numPlayers + 1;
  for (let i = 0; i < numPlayers; i++) {
    const moves = getValidMoves(board, candidate);
    if (moves.length > 0) {
      return {
        board, size, numPlayers,
        currentPlayer: candidate,
        gameOver:      false,
        winner:        null,
        validMoves:    moves,
        passedPlayers,
      };
    }
    passedPlayers.push(candidate);
    candidate = candidate % numPlayers + 1;
  }

  // No one can move → game over; find winner by piece count
  const counts = countPieces(board);
  let maxCount = -1;
  let winner   = null;
  let isTie    = false;
  for (let p = 1; p <= numPlayers; p++) {
    const cnt = counts[p] ?? 0;
    if (cnt > maxCount)        { maxCount = cnt; winner = p; isTie = false; }
    else if (cnt === maxCount) { isTie = true; }
  }
  if (isTie) winner = null;

  return {
    board, size, numPlayers,
    currentPlayer: lastPlayer % numPlayers + 1,
    gameOver:      true,
    winner,
    validMoves:    [],
    passedPlayers: [],
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  PLAYER,
  DEFAULT_BOARD_SIZE,
  MIN_BOARD_SIZE,
  MAX_BOARD_SIZE,
  DEFAULT_NUM_PLAYERS,
  MIN_NUM_PLAYERS,
  MAX_NUM_PLAYERS,
  createGameState,
  placePiece,
  getValidMoves,
  isValidMove,
  countPieces,
  cloneBoard,
};
