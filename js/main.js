/**
 * main.js
 * Application entry point.
 * Wires together the game logic (reversi.js) and the UI (ui.js).
 */

'use strict';

import { createGameState, placePiece } from './reversi.js';
import { BoardRenderer, ScoreDisplay, StatusDisplay } from './ui.js';

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

class ReversiApp {
  constructor() {
    // DOM references
    this._boardContainer = document.getElementById('board-container');
    this._statusEl       = document.getElementById('status');
    this._resetBtn       = document.getElementById('btn-reset');
    this._hintsToggle    = document.getElementById('toggle-hints');
    this._sizeSelect     = document.getElementById('board-size');
    this._playerSelect   = document.getElementById('player-count');
    this._scorePanel     = document.getElementById('score-panel');

    // UI helpers
    this._boardRenderer = new BoardRenderer(
      this._boardContainer,
      (r, c) => this._handleCellClick(r, c)
    );
    this._scoreDisplay  = new ScoreDisplay(this._scorePanel);
    this._statusDisplay = new StatusDisplay(this._statusEl);

    // Settings
    this._showHints = true;

    // Wire up controls
    this._resetBtn.addEventListener('click', () => this._reset());
    this._hintsToggle.addEventListener('change', (e) => {
      this._showHints = e.target.checked;
      this._render();
    });
    this._sizeSelect.addEventListener('change', () => this._reset());
    this._playerSelect.addEventListener('change', () => this._reset());

    // Recompute cell size if the window is resized
    window.addEventListener('resize', () => {
      if (this._state) {
        this._boardRenderer.rebuild(this._state.size);
        this._render();
      }
    });

    // Start game
    this._reset();
  }

  // -------------------------------------------------------------------------
  // Game control
  // -------------------------------------------------------------------------

  _selectedSize() {
    return parseInt(this._sizeSelect.value, 10);
  }

  _selectedPlayers() {
    return parseInt(this._playerSelect.value, 10);
  }

  _reset() {
    const size       = this._selectedSize();
    const numPlayers = this._selectedPlayers();
    this._boardRenderer.rebuild(size);
    this._scoreDisplay.rebuild(numPlayers);
    this._state = createGameState(size, numPlayers);
    this._render();
  }

  _handleCellClick(row, col) {
    if (this._state.gameOver) return;

    const nextState = placePiece(this._state, row, col);
    if (nextState === this._state) return;  // invalid cell

    this._state = nextState;

    if (nextState.passedPlayers.length > 0 && !nextState.gameOver) {
      // Show pass message then resume normal rendering
      this._statusDisplay.showPass(nextState.passedPlayers, nextState.numPlayers);
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
    this._statusDisplay.update(this._state);
    this._boardContainer.classList.toggle('board--disabled', this._state.gameOver);
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  new ReversiApp();
});
