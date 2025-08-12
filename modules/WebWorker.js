/**
 * @module WebWorker
 * @copyright 2025-06-29 Magnus Dümke
 * @license MIT
 * @author Magnus Dümke
 * @version 1.0.0
 * @since 2025-06-29
 * @description This module is executed in a Web Worker context. It handles
 * the AI decision-making process using an algorithm specified from the request message data.
 * Currently, Minimax with Alpha-Beta pruning is the only option.
 * @requires module:MinimaxAB
 */

import { GridCell, BoardState, Player, PlayerState } from "./GameState.js";
import { findBestMove } from "./MinimaxAB.js";

self.onmessage = function (event) {
  //rebuild all instances related to the DOM-decoupled board state.
  const boardState = BoardState.createFromStructuredClone(event.data);
  const move = findBestMove(boardState);
  self.postMessage(move);
};
