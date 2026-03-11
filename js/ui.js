/**
 * ui.js
 * Handles all DOM rendering and user interaction.
 * Depends on reversi.js exports via ES module imports.
 */

'use strict';

import { PLAYER, countPieces } from './reversi.js';

// ---------------------------------------------------------------------------
// Cell-size computation
// ---------------------------------------------------------------------------

/**
 * Compute an appropriate cell size (px) so the board fits in the viewport.
 * @param {number} boardSize - Number of cells per side
 * @returns {number}
 */
function computeCellSize(boardSize) {
  // Leave horizontal padding (48px) and board border (8px) room.
  const available = Math.min(window.innerWidth - 56, 640);
  const fromViewport = Math.floor(available / boardSize);
  return Math.max(16, Math.min(60, fromViewport));
}

// ---------------------------------------------------------------------------
// BoardRenderer — builds / updates the board grid in the DOM
// ---------------------------------------------------------------------------

export class BoardRenderer {
  /**
   * @param {HTMLElement} containerEl - The element that will hold the board
   * @param {function(number, number): void} onCellClick - Called when a cell is clicked
   */
  constructor(containerEl, onCellClick) {
    this._container   = containerEl;
    this._onCellClick = onCellClick;
    this._cells       = []; // 2D array of <td> elements
    this._currentSize = 0;  // Track built size to avoid unnecessary rebuilds
  }

  // -------------------------------------------------------------------------
  // Public: rebuild the DOM grid for a given board size
  // -------------------------------------------------------------------------

  /**
   * Reconstruct the board DOM for `boardSize`.
   * Call this whenever the board size changes (e.g. on game reset with new size).
   * @param {number} boardSize
   */
  rebuild(boardSize) {
    if (this._currentSize === boardSize) return;
    this._currentSize = boardSize;
    this._build(boardSize);
    this._applyCellSize(boardSize);
  }

  // -------------------------------------------------------------------------
  // Public: render a GameState onto the DOM
  // -------------------------------------------------------------------------

  /**
   * Sync the board DOM with the given game state.
   * Assumes `rebuild()` has already been called for the correct board size.
   *
   * @param {import('./reversi.js').GameState} state
   * @param {boolean} showHints - Whether to highlight valid moves
   */
  render(state, showHints) {
    const size     = state.board.length;
    const validSet = new Set(state.validMoves.map(([r, c]) => `${r},${c}`));

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const td      = this._cells[r][c];
        const piece   = state.board[r][c];
        const isHint  = showHints && validSet.has(`${r},${c}`);

        td.className = 'cell';
        td.innerHTML = '';
        td.removeAttribute('aria-label');

        if (piece === PLAYER.BLACK) {
          td.appendChild(this._createDisc('black'));
          td.setAttribute('aria-label', 'Black piece');
        } else if (piece === PLAYER.WHITE) {
          td.appendChild(this._createDisc('white'));
          td.setAttribute('aria-label', 'White piece');
        }

        if (isHint) {
          td.classList.add('hint');
          td.setAttribute('aria-label', 'Valid move');
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** @param {number} boardSize */
  _build(boardSize) {
    this._container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'board';
    table.setAttribute('role', 'grid');
    table.setAttribute('aria-label', 'Reversi board');

    this._cells = [];
    for (let r = 0; r < boardSize; r++) {
      const tr = document.createElement('tr');
      this._cells[r] = [];

      for (let c = 0; c < boardSize; c++) {
        const td = document.createElement('td');
        td.className = 'cell';
        td.setAttribute('role', 'gridcell');
        td.dataset.row = r;
        td.dataset.col = c;
        td.addEventListener('click', () => this._onCellClick(r, c));

        this._cells[r][c] = td;
        tr.appendChild(td);
      }

      table.appendChild(tr);
    }

    this._container.appendChild(table);
  }

  /**
   * Set CSS custom properties on the container so cells and discs
   * scale to fit the viewport.
   * @param {number} boardSize
   */
  _applyCellSize(boardSize) {
    const cellSize = computeCellSize(boardSize);
    const discSize = Math.max(10, Math.round(cellSize * 0.76));
    const hintDot  = Math.max(6,  Math.round(cellSize * 0.30));
    this._container.style.setProperty('--cell-size',     `${cellSize}px`);
    this._container.style.setProperty('--disc-size',     `${discSize}px`);
    this._container.style.setProperty('--hint-dot-size', `${hintDot}px`);
  }

  /** @param {'black'|'white'} color */
  _createDisc(color) {
    const disc = document.createElement('div');
    disc.className = `disc disc--${color}`;
    return disc;
  }
}

// ---------------------------------------------------------------------------
// ScoreDisplay — updates score counters in the DOM
// ---------------------------------------------------------------------------

export class ScoreDisplay {
  /**
   * @param {HTMLElement} blackEl - Element showing black's score
   * @param {HTMLElement} whiteEl - Element showing white's score
   */
  constructor(blackEl, whiteEl) {
    this._blackEl = blackEl;
    this._whiteEl = whiteEl;
  }

  /** @param {number[][]} board */
  update(board) {
    const counts = countPieces(board);
    this._blackEl.textContent = counts[PLAYER.BLACK];
    this._whiteEl.textContent = counts[PLAYER.WHITE];
  }
}

// ---------------------------------------------------------------------------
// StatusDisplay — shows whose turn it is, pass notices, game-over results
// ---------------------------------------------------------------------------

export class StatusDisplay {
  /**
   * @param {HTMLElement} el - Container element for status messages
   */
  constructor(el) {
    this._el = el;
  }

  /** @param {import('./reversi.js').GameState} state */
  update(state) {
    if (state.gameOver) {
      if (state.winner === null) {
        this._set('draw', '引き分けです！');
      } else {
        const name = state.winner === PLAYER.BLACK ? '黒' : '白';
        this._set('win', `${name}の勝利です！`);
      }
      return;
    }

    const name = state.currentPlayer === PLAYER.BLACK ? '黒' : '白';
    this._set('turn', `${name}の番です`);
  }

  /**
   * Show a "pass" notice when a player is forced to pass.
   * @param {number} passedPlayer
   */
  showPass(passedPlayer) {
    const name = passedPlayer === PLAYER.BLACK ? '黒' : '白';
    this._set('pass', `${name}は置ける場所がないためパスします`);
  }

  // -------------------------------------------------------------------------

  _set(modifier, text) {
    this._el.textContent = text;
    this._el.className   = `status status--${modifier}`;
  }
}
