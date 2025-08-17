/**
 * @module AiWorker
 * @description This module is executed in a Web Worker context. It handles
 * the AI decision-making process using an algorithm specified from the request message data.
 * Currently, Minimax with Alpha-Beta pruning is the only option.
 * @requires module:MinimaxAB
 * @requires module:GameState
 */

import { BoardState } from "./GameState.js";
import { findBestMove } from "./MinimaxAB.js";
import { workerMessageScheme } from "./AsyncWorkerAPI.js";

self.addEventListener("message", (event) => {
  try {
    if (event.data.request.type === "findBestMove") {
      //rebuild all instances related to the DOM-decoupled board state.
      const boardState = BoardState.createFromStructuredClone(
        event.data.request.parameter[0]
      );
      const move = findBestMove(boardState);
      event.data.response.error = false;
      event.data.response.message = move;
      self.postMessage(event.data);
    } else {
      throw new Error("Invalid request  type for AiWorker");
    }
  } catch (error) {
    const errorResponse = structuredClone(workerMessageScheme);
    errorResponse.response.error = true;
    errorResponse.response.message = error;
    self.postMessage(errorResponse);
  }
});
