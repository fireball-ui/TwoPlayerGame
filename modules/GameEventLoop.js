/**
 * @module GameEventLoop
 * @description
 * @requires module:GameState
 */

import { GridCell, BoardState, Sidebar, Move } from "./GameState.js";
import { checkWin } from "./GameLogic.js";
import {
  dispatchWorker,
  workerMessageScheme,
  cssTransitionEnded,
} from "./AsyncAPIWrapper.js";
import { getLocalMoves } from "./GameLogic.js";

/**
 * Handles the mouse hover event on entry of a cell in the BoardState.
 * It highlights the hovered cell and its valid neighboring cells for the current player.
 *
 * @param {GridCell} hoveredCell
 * @param {BoardState, Sidebar} domBoardState
 * @param {Player} currentPlayer
 * @returns {void}
 */
function handleHoveredCellIn(hoveredCell, domBoardState, currentPlayer) {
  const markedCells = document.querySelectorAll(".mark");
  if (markedCells.length > 0) {
    return;
  }
  const neighbors = getLocalMoves(hoveredCell, currentPlayer, domBoardState);
  if (neighbors.length === 0) {
    return;
  }
  hoveredCell.addClass("select");
  neighbors.forEach((neighbor) => {
    neighbor.addClass("hover");
  });
}

/**
 * Handles the mouse hover event on exit of a cell in the BoardState.
 * It removes the highlight from the hovered cell and its valid neighboring cells.
 *
 * @returns {void}
 */
function handleHoveredCellOut() {
  document.querySelectorAll(".hover, .select").forEach((cell) => {
    cell.classList.remove("hover", "select");
  });
}

/**
 * This function handles the first out of two "click event verification steps",
 * in order to play the move in the browser UI.
 * It marks and highlights the clicked source cell persistently as well as all valid target cells,
 * e.g. the hovering effects for all cells are disabled.
 * Returns true if the move was prepared successfully, false otherwise.
 * @param {GridCell} clickedCell
 * @returns {boolean}
 */
function prepareMoveForCell(clickedCell) {
  if (clickedCell.domEl.classList.contains("select")) {
    clickedCell.removeClass("select");
    clickedCell.addClass("mark");
    document.querySelectorAll(".hover").forEach((cell) => {
      cell.classList.remove("hover");
      cell.classList.add("click");
    });
    return true;
  }
  return false;
}

/**
 * This function discards the marked cell in the prepare step for movement,
 * and re-enables the hovering effects for all cells.
 * Returns true if the discard was successfully, false otherwise.
 * @param {GridCell} clickedCell
 * @returns {boolean}
 */
function discardMoveForCell(clickedCell) {
  if (clickedCell.domEl.classList.contains("mark")) {
    clickedCell.domEl.classList.remove("mark");
    document.querySelectorAll(".click").forEach((cell) => {
      cell.classList.remove("click");
    });
    return true;
  }
  return false;
}

/**
 * All UI events for the board must be disabled during the AI processing of the spawned Web Worker.
 * @param {BoardState} domBoardState
 * @returns {void}
 */
function disableBoardEvents(domBoardState) {
  // Disable all event handlers for the board to prevent further interactions
  domBoardState.disableBoardEvents = true;
}

/**
 * Enable all UI events for the next move after the AI processing of the spawned Web Worker.
 * @param {BoardState} domBoardState
 * @returns {void}
 */
function enableBoardEvents(domBoardState) {
  // Disable all event handlers for the board to prevent further interactions
  domBoardState.disableBoardEvents = false;
}

/**
 * Removes all cell effects after a played move.
 * @returns {void}
 */
function discardBoardAnimations() {
  document.querySelectorAll(".boardCell").forEach((cell) => {
    cell.classList.remove("select", "hover", "mark", "click");
  });
}

async function playUserMove(
  domBoardState,
  settings,
  aiWorker,
  loggerWriter,
  clickedCell
) {
  // Main game event loop starts here
  const markedCell = domBoardState.mapDomElement.get(
    document.querySelector(".mark")
  );
  // Play move, update BoardState, update Sidebar and turn player
  domBoardState.applyMoveAndTurn(markedCell, clickedCell);
  await loggerWriter.update(
    new Move(markedCell, clickedCell, domBoardState.playerState)
  );
  disableBoardEvents(domBoardState);
  discardBoardAnimations();
  let player = domBoardState.playerState.twoPlayer.find(
    (player) => player.turn === false
  );
  Sidebar.playerMap.get(player).refreshDashboard();
  // interactive player has won?
  if (checkWin(domBoardState, player, settings)) {
    document.querySelector(".board").classList.add("filterGray");
    Sidebar.playerMap.get(player).refreshDashboard();
  } else {
    playBotMove(domBoardState, settings, aiWorker, loggerWriter);
  }
}

async function playBotMove(domBoardState, settings, aiWorker, loggerWriter) {
  //animate css load spinner
  const spinner1 = document.querySelector(".spinner1");
  const spinner2 = document.querySelector(".spinner2");
  const spinner3 = document.querySelector(".spinner3");
  const spinner4 = document.querySelector(".spinner4");
  const spinner5 = document.querySelector(".spinner5");
  const spinner6 = document.querySelector(".spinner6");
  spinner1.classList.add("spinner1Animate");
  spinner2.classList.add("spinner2Animate");
  spinner3.classList.add("spinner3Animate");
  spinner4.classList.add("spinner4Animate");
  spinner5.classList.add("spinner5Animate");
  spinner6.classList.add("spinner6Animate");
  spinner1.querySelector("g").classList.remove("svgHide");
  spinner2.querySelector("g").classList.remove("svgHide");
  spinner3.querySelector("g").classList.remove("svgHide");
  spinner4.querySelector("g").classList.remove("svgHide");
  spinner5.querySelector("g").classList.remove("svgHide");
  spinner6.querySelector("g").classList.remove("svgHide");
  // Dispatch worker for AI processing
  domBoardState.waitForWebWorker = true;
  const aiWorkerRequest = structuredClone(workerMessageScheme);
  aiWorkerRequest.request.type = "findBestMove";
  aiWorkerRequest.request.parameter.push(domBoardState.cloneInstance());
  aiWorkerRequest.request.parameter.push(settings.cloneInstance());
  const aiWorkerResponse = await dispatchWorker(
    aiWorker,
    aiWorkerRequest,
    settings.searchRules.settings.timeout * 1000
  );
  if (aiWorkerResponse.response.error === true) {
    throw new Error(
      "Caught error in ai worker: " + aiWorkerResponse.response.message
    );
  }
  // deserialize ai worker response and map the GridCell instances for the next move
  let srcCellId = aiWorkerResponse.response.message[0]._id ?? null;
  let tgtCellId = aiWorkerResponse.response.message[1]._id ?? null;
  if (
    srcCellId === null ||
    tgtCellId === null ||
    isNaN(srcCellId) ||
    isNaN(tgtCellId)
  ) {
    throw new Error(
      "Invalid move data received from worker. Expected two integers for the source and target cell identifiers."
    );
  }
  let moveBotSrcInst = domBoardState.cells.find(
    (cell) => cell.id === srcCellId
  );
  moveBotSrcInst ??= null;
  let moveBotTgtInst = domBoardState.cells.find(
    (cell) => cell.id === tgtCellId
  );
  moveBotTgtInst ??= null;
  if (
    moveBotSrcInst === null ||
    moveBotTgtInst === null ||
    !moveBotSrcInst instanceof GridCell ||
    !moveBotTgtInst instanceof GridCell
  ) {
    throw new Error(
      "Invalid move data received from worker. Invalid integer identifier for the source or target cell."
    );
  }
  //hide css load spinner
  spinner1.classList.remove("spinner1Animate");
  spinner2.classList.remove("spinner2Animate");
  spinner3.classList.remove("spinner3Animate");
  spinner4.classList.remove("spinner4Animate");
  spinner5.classList.remove("spinner5Animate");
  spinner6.classList.remove("spinner6Animate");
  spinner1.querySelector("g").classList.add("svgHide");
  spinner2.querySelector("g").classList.add("svgHide");
  spinner3.querySelector("g").classList.add("svgHide");
  spinner4.querySelector("g").classList.add("svgHide");
  spinner5.querySelector("g").classList.add("svgHide");
  spinner6.querySelector("g").classList.add("svgHide");
  // trigger animations for this bot's move and wait for the end of the css transitions
  await cssTransitionEnded(moveBotSrcInst.domEl, "select");
  await cssTransitionEnded(moveBotTgtInst.domEl, "hover");
  // apply move
  domBoardState.applyMoveAndTurn(moveBotSrcInst, moveBotTgtInst);
  await loggerWriter.update(
    new Move(moveBotSrcInst, moveBotTgtInst, domBoardState.playerState)
  );
  // remove css classes for cleanup and animation of this bot's move
  moveBotSrcInst.domEl.classList.remove("select");
  moveBotTgtInst.domEl.classList.remove("hover");
  const player = domBoardState.playerState.twoPlayer.find(
    (player) => player.turn === false
  );
  Sidebar.playerMap.get(player).refreshDashboard();
  domBoardState.waitForWebWorker = false;
  if (checkWin(domBoardState, player, settings)) {
    document.querySelector(".board").classList.add("filterGray");
    Sidebar.playerMap.get(player).refreshDashboard();
  } else {
    // Enable board events for the next move
    enableBoardEvents(domBoardState);
  }
}

export {
  enableBoardEvents,
  handleHoveredCellIn,
  handleHoveredCellOut,
  prepareMoveForCell,
  discardMoveForCell,
  playUserMove,
};
