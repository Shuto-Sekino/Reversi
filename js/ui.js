/**
 * ui.js
 * Handles all DOM rendering and user interaction.
 * Depends on reversi.js exports via ES module imports.
 */

'use strict';

import { PLAYER, countPieces } from './reversi.js';

// ---------------------------------------------------------------------------
// Player configuration — name and disc colour per mode
// ---------------------------------------------------------------------------

const PLAYER_INFO = {
  2: [
    { id: 1, name: '黒', color: 'black'  },
    { id: 2, name: '白', color: 'white'  },
  ],
  3: [
    { id: 1, name: '赤', color: 'red'    },
    { id: 2, name: '青', color: 'blue'   },
    { id: 3, name: '緑', color: 'green'  },
  ],
  4: [
    { id: 1, name: '赤', color: 'red'    },
    { id: 2, name: '青', color: 'blue'   },
    { id: 3, name: '緑', color: 'green'  },
    { id: 4, name: '黄', color: 'yellow' },
  ],
};

function getPlayerInfo(playerId, numPlayers) {
  return PLAYER_INFO[numPlayers][playerId - 1];
}

// ---------------------------------------------------------------------------
// Cell-size computation
// ---------------------------------------------------------------------------

function computeCellSize(boardSize) {
  const available = Math.min(window.innerWidth - 56, 640);
  return Math.max(16, Math.min(60, Math.floor(available / boardSize)));
}

// ---------------------------------------------------------------------------
// BoardRenderer — builds / updates the board grid in the DOM
// ---------------------------------------------------------------------------

export class BoardRenderer {
  constructor(containerEl, onCellClick) {
    this._container   = containerEl;
    this._onCellClick = onCellClick;
    this._cells       = [];
    this._currentSize = 0;
  }

  /** Reconstruct the DOM grid when the board size changes. */
  rebuild(boardSize) {
    if (this._currentSize === boardSize) return;
    this._currentSize = boardSize;
    this._build(boardSize);
    this._applyCellSize(boardSize);
  }

  /** Sync DOM with the given game state. */
  render(state, showHints) {
    const { board, numPlayers } = state;
    const size     = board.length;
    const validSet = new Set(state.validMoves.map(([r, c]) => `${r},${c}`));

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const td     = this._cells[r][c];
        const piece  = board[r][c];
        const isHint = showHints && validSet.has(`${r},${c}`);

        td.className = 'cell';
        td.innerHTML = '';
        td.removeAttribute('aria-label');

        if (piece !== PLAYER.NONE) {
          const { color, name } = getPlayerInfo(piece, numPlayers);
          td.appendChild(this._createDisc(color));
          td.setAttribute('aria-label', name);
        }

        if (isHint) {
          td.classList.add('hint');
          td.setAttribute('aria-label', '置ける場所');
        }
      }
    }
  }

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

  _applyCellSize(boardSize) {
    const cellSize = computeCellSize(boardSize);
    const discSize = Math.max(10, Math.round(cellSize * 0.76));
    const hintDot  = Math.max(6,  Math.round(cellSize * 0.30));
    this._container.style.setProperty('--cell-size',     `${cellSize}px`);
    this._container.style.setProperty('--disc-size',     `${discSize}px`);
    this._container.style.setProperty('--hint-dot-size', `${hintDot}px`);
  }

  _createDisc(color) {
    const disc = document.createElement('div');
    disc.className = `disc disc--${color}`;
    return disc;
  }
}

// ---------------------------------------------------------------------------
// ScoreDisplay — dynamically builds and updates score counters
// ---------------------------------------------------------------------------

export class ScoreDisplay {
  /**
   * @param {HTMLElement} panelEl - The score panel container
   */
  constructor(panelEl) {
    this._panel      = panelEl;
    this._valueEls   = {};  // playerId → <div> element
    this._numPlayers = 0;
  }

  /** Rebuild the score panel when the player count changes. */
  rebuild(numPlayers) {
    if (this._numPlayers === numPlayers) return;
    this._numPlayers = numPlayers;
    this._panel.innerHTML = '';
    this._valueEls = {};

    for (const { id, name, color } of PLAYER_INFO[numPlayers]) {
      const item    = document.createElement('div');
      item.className = 'score-item';

      const discEl  = document.createElement('div');
      discEl.className = `score-disc score-disc--${color}`;
      discEl.setAttribute('aria-hidden', 'true');

      const infoEl  = document.createElement('div');

      const labelEl = document.createElement('div');
      labelEl.className   = 'score-label';
      labelEl.textContent = name;

      const valueEl = document.createElement('div');
      valueEl.className   = 'score-value';
      valueEl.id          = `score-p${id}`;
      valueEl.textContent = '0';

      infoEl.appendChild(labelEl);
      infoEl.appendChild(valueEl);
      item.appendChild(discEl);
      item.appendChild(infoEl);
      this._panel.appendChild(item);

      this._valueEls[id] = valueEl;
    }
  }

  /** @param {number[][]} board */
  update(board) {
    const counts = countPieces(board);
    for (const [id, el] of Object.entries(this._valueEls)) {
      el.textContent = counts[id] ?? 0;
    }
  }
}

// ---------------------------------------------------------------------------
// StatusDisplay — shows turn, pass notices, and game-over results
// ---------------------------------------------------------------------------

export class StatusDisplay {
  /** @param {HTMLElement} el */
  constructor(el) {
    this._el = el;
  }

  /** @param {import('./reversi.js').GameState} state */
  update(state) {
    if (state.gameOver) {
      if (state.winner === null) {
        this._set('draw', '引き分けです！');
      } else {
        const { name } = getPlayerInfo(state.winner, state.numPlayers);
        this._set('win', `${name}の勝利です！`);
      }
      return;
    }

    const { name } = getPlayerInfo(state.currentPlayer, state.numPlayers);
    this._set('turn', `${name}の番です`);
  }

  /**
   * Show a pass notice for skipped players.
   * @param {number[]} passedPlayers
   * @param {number}   numPlayers
   */
  showPass(passedPlayers, numPlayers) {
    const names = passedPlayers
      .map(p => getPlayerInfo(p, numPlayers).name)
      .join('・');
    this._set('pass', `${names} は置ける場所がないためパスします`);
  }

  _set(modifier, text) {
    this._el.textContent = text;
    this._el.className   = `status status--${modifier}`;
  }
}
