/**
 * @module AiWorker
 * @description This module is executed in a Web Worker context. It handles
 * the AI decision-making process for finding the next best move.
 * Currently, Minimax with Alpha-Beta pruning is the only available option.
 * The heuristic score algorithm for non-terminal states inside the evaluation function
 * can be dynamically customized using the range sliders from the scroll container
 * items of the settings section.
 * Whenever a new worker task is dispatched, the current settings are cached and
 * immediately taken into account.
 *
 * @requires module:MinimaxAB
 * @requires module:GameState
 */

import { BoardState } from "./GameState.js";
import { findBestMove } from "./MinimaxAB.js";
import { workerMessageScheme } from "./AsyncAPIWrapper.js";

self.addEventListener("message", (event) => {
  try {
    if (event.data.request.type === "findBestMove") {
      //rebuild all instances related to the DOM-decoupled board state.
      const boardState = BoardState.createFromStructuredClone(
        event.data.request.parameter[0]
      );
      const settings = event.data.request.parameter[1];
      const move = findBestMove(boardState, settings);
      event.data.response.error = false;
      event.data.response.message = move;
      self.postMessage(event.data);
    } else {
      throw new Error("Invalid request  type for AiWorker");
    }
  } catch (error) {
    console.log(error);
    const errorResponse = structuredClone(workerMessageScheme);
    errorResponse.response.error = true;
    errorResponse.response.message = "Caught error in ai worker: " + error;
    self.postMessage(errorResponse);
  }
});

self.addEventListener("error", (event) => {
  console.log(error);
});
