/**
 * main.js
 * Application entry point.
 * Wires together the game logic (reversi.js) and the UI (ui.js).
 */

'use strict';

import { createGameState, placePiece, PLAYER } from './reversi.js';
import { BoardRenderer, ScoreDisplay, StatusDisplay } from './ui.js';

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

class ReversiApp {
  constructor() {
    // DOM references
    this._boardContainer = document.getElementById('board-container');
    this._scoreBlack     = document.getElementById('score-black');
    this._scoreWhite     = document.getElementById('score-white');
    this._statusEl       = document.getElementById('status');
    this._resetBtn       = document.getElementById('btn-reset');
    this._hintsToggle    = document.getElementById('toggle-hints');

    // UI helpers
    this._boardRenderer = new BoardRenderer(
      this._boardContainer,
      (r, c) => this._handleCellClick(r, c)
    );
    this._scoreDisplay  = new ScoreDisplay(this._scoreBlack, this._scoreWhite);
    this._statusDisplay = new StatusDisplay(this._statusEl);

    // Settings
    this._showHints = true;

    // Wire up controls
    this._resetBtn.addEventListener('click', () => this._reset());
    this._hintsToggle.addEventListener('change', (e) => {
      this._showHints = e.target.checked;
      this._render();
    });

    // Start game
    this._reset();
  }

  // -------------------------------------------------------------------------
  // Game control
  // -------------------------------------------------------------------------

  _reset() {
    this._state = createGameState();
    this._previousPlayer = null;
    this._render();
  }

  _handleCellClick(row, col) {
    if (this._state.gameOver) return;

    const prevPlayer = this._state.currentPlayer;
    const nextState  = placePiece(this._state, row, col);

    // No change means the click was on an invalid cell
    if (nextState === this._state) return;

    // Detect pass: previous player is the same as current (opponent was skipped)
    const wasPass =
      !nextState.gameOver &&
      nextState.currentPlayer === prevPlayer;

    this._state = nextState;

    if (wasPass) {
      this._statusDisplay.showPass(PLAYER.BLACK + PLAYER.WHITE - prevPlayer);
      // Delay the normal status update so the pass message is readable
      setTimeout(() => this._render(), 1200);
    } else {
      this._render();
    }
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  _render() {
    this._boardRenderer.render(this._state, this._showHints);
    this._scoreDisplay.update(this._state.board);
    this._statusDisplay.update(this._state, this._previousPlayer);
    this._previousPlayer = this._state.currentPlayer;

    // Disable board interaction when game is over
    this._boardContainer.classList.toggle('board--disabled', this._state.gameOver);
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  new ReversiApp();
});
