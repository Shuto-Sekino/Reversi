/**
 * reversi.js
 * Pure game logic for Reversi (Othello).
 * No DOM dependencies — all state is plain data.
 * Board size is variable (any even number ≥ 4).
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** @enum {number} */
const PLAYER = Object.freeze({
  NONE: 0,
  BLACK: 1,
  WHITE: 2,
});

/** Default board size (standard Othello). */
const DEFAULT_BOARD_SIZE = 8;

/** Minimum and maximum supported board sizes (must be even). */
const MIN_BOARD_SIZE = 4;
const MAX_BOARD_SIZE = 32;

/** All 8 directions on the board */
const DIRECTIONS = Object.freeze([
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
]);

// ---------------------------------------------------------------------------
// Board helpers
// ---------------------------------------------------------------------------

/**
 * Create a fresh N×N board with the standard opening position.
 * @param {number} size - Even number between MIN_BOARD_SIZE and MAX_BOARD_SIZE
 * @returns {number[][]}
 */
function createInitialBoard(size) {
  const board = Array.from({ length: size }, () =>
    new Array(size).fill(PLAYER.NONE)
  );
  const mid = size / 2;
  board[mid - 1][mid - 1] = PLAYER.WHITE;
  board[mid - 1][mid]     = PLAYER.BLACK;
  board[mid][mid - 1]     = PLAYER.BLACK;
  board[mid][mid]         = PLAYER.WHITE;
  return board;
}

/**
 * Deep-copy a board.
 * @param {number[][]} board
 * @returns {number[][]}
 */
function cloneBoard(board) {
  return board.map(row => row.slice());
}

/**
 * Return the opponent of the given player.
 * @param {number} player
 * @returns {number}
 */
function opponent(player) {
  return player === PLAYER.BLACK ? PLAYER.WHITE : PLAYER.BLACK;
}

/**
 * Check whether (row, col) is inside an N×N board.
 * @param {number} row
 * @param {number} col
 * @param {number} size
 * @returns {boolean}
 */
function inBounds(row, col, size) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

// ---------------------------------------------------------------------------
// Rule engine
// ---------------------------------------------------------------------------

/**
 * Collect all opponent pieces that would be flipped if `player` places at
 * (row, col).  Returns an empty array when the move is invalid.
 *
 * @param {number[][]} board
 * @param {number} row
 * @param {number} col
 * @param {number} player
 * @returns {Array<[number, number]>}
 */
function getFlips(board, row, col, player) {
  if (board[row][col] !== PLAYER.NONE) return [];

  const size = board.length;
  const opp  = opponent(player);
  const flips = [];

  for (const [dr, dc] of DIRECTIONS) {
    const line = [];
    let r = row + dr;
    let c = col + dc;

    while (inBounds(r, c, size) && board[r][c] === opp) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }

    if (line.length > 0 && inBounds(r, c, size) && board[r][c] === player) {
      flips.push(...line);
    }
  }

  return flips;
}

/**
 * Check whether placing at (row, col) is a legal move for `player`.
 *
 * @param {number[][]} board
 * @param {number} row
 * @param {number} col
 * @param {number} player
 * @returns {boolean}
 */
function isValidMove(board, row, col, player) {
  return getFlips(board, row, col, player).length > 0;
}

/**
 * Return all valid moves for `player` as an array of [row, col] pairs.
 *
 * @param {number[][]} board
 * @param {number} player
 * @returns {Array<[number, number]>}
 */
function getValidMoves(board, player) {
  const size  = board.length;
  const moves = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isValidMove(board, r, c, player)) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

/**
 * Apply a move: place the piece and flip captured stones.
 * Mutates `board` in-place and returns it.
 *
 * @param {number[][]} board
 * @param {number} row
 * @param {number} col
 * @param {number} player
 * @returns {number[][]}
 */
function applyMove(board, row, col, player) {
  const flips = getFlips(board, row, col, player);
  board[row][col] = player;
  for (const [r, c] of flips) {
    board[r][c] = player;
  }
  return board;
}

/**
 * Count pieces for each player.
 *
 * @param {number[][]} board
 * @returns {{ [PLAYER.BLACK]: number, [PLAYER.WHITE]: number }}
 */
function countPieces(board) {
  let black = 0;
  let white = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === PLAYER.BLACK) black++;
      else if (cell === PLAYER.WHITE) white++;
    }
  }
  return { [PLAYER.BLACK]: black, [PLAYER.WHITE]: white };
}

// ---------------------------------------------------------------------------
// Game state machine
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GameState
 * @property {number[][]} board         - Current board
 * @property {number}     size          - Board side length (N in N×N)
 * @property {number}     currentPlayer - Whose turn it is
 * @property {boolean}    gameOver      - True when the game has ended
 * @property {number|null} winner       - Winning player, or null for a draw
 * @property {Array<[number,number]>} validMoves - Legal moves for currentPlayer
 */

/**
 * Create the initial game state for an N×N board.
 * @param {number} [size=DEFAULT_BOARD_SIZE] - Even number in [MIN_BOARD_SIZE, MAX_BOARD_SIZE]
 * @returns {GameState}
 */
function createGameState(size = DEFAULT_BOARD_SIZE) {
  const board         = createInitialBoard(size);
  const currentPlayer = PLAYER.BLACK; // Black moves first
  const validMoves    = getValidMoves(board, currentPlayer);
  return {
    board,
    size,
    currentPlayer,
    gameOver: false,
    winner: null,
    validMoves,
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
  return resolveNextTurn(newBoard, state.currentPlayer, state.size);
}

/**
 * Determine whose turn it is after a move, handling pass/game-over.
 *
 * @param {number[][]} board
 * @param {number} lastPlayer
 * @param {number} size
 * @returns {GameState}
 */
function resolveNextTurn(board, lastPlayer, size) {
  const next      = opponent(lastPlayer);
  const nextMoves = getValidMoves(board, next);

  if (nextMoves.length > 0) {
    return { board, size, currentPlayer: next, gameOver: false, winner: null, validMoves: nextMoves };
  }

  // Next player must pass — check if last player can still move
  const lastMoves = getValidMoves(board, lastPlayer);
  if (lastMoves.length > 0) {
    return { board, size, currentPlayer: lastPlayer, gameOver: false, winner: null, validMoves: lastMoves };
  }

  // Neither player can move → game over
  const counts = countPieces(board);
  let winner = null;
  if (counts[PLAYER.BLACK] > counts[PLAYER.WHITE]) winner = PLAYER.BLACK;
  else if (counts[PLAYER.WHITE] > counts[PLAYER.BLACK]) winner = PLAYER.WHITE;

  return { board, size, currentPlayer: next, gameOver: true, winner, validMoves: [] };
}

// ---------------------------------------------------------------------------
// Exports (plain ES module)
// ---------------------------------------------------------------------------

export {
  PLAYER,
  DEFAULT_BOARD_SIZE,
  MIN_BOARD_SIZE,
  MAX_BOARD_SIZE,
  createGameState,
  placePiece,
  getValidMoves,
  isValidMove,
  countPieces,
  cloneBoard,
  opponent,
};
