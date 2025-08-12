/**
 * @module main
 * @description This main module is the primary entry point when the web page is served and the DOM content is loaded.
 * It initializes the game board, sets up event handlers for user interactions,
 * and manages the GameState including player turns and move execution.
 * It also handles the interaction with the spawned Web Worker for AI moves.
 * It utilizes the GameState for managing all game state data,
 * the GameLogic for core game rules and moves,
 * and the MinimaxAB module for AI decision-making.
 * @requires module:GameState
 * @requires module:GameLogic
 * @requires module:MinimaxAB
 * @requires module:SvgRender
 */

import {
  GridCell,
  BoardState,
  Player,
  PlayerState,
  PLAYER_ID,
  Sidebar,
} from "./modules/GameState.js";
import { getLocalMoves, checkWin } from "./modules/GameLogic.js";
import { createSvgTowerVector } from "./modules/SvgRender.js";

/**
 * Creates a game board by generating a grid of cells, initializing their state,
 * and appending them to the provided board element. Also sets up initial player positions.
 *
 * @param {HTMLElement} board - The CSS grid container DOM element to which the cells will be appended.
 * @returns {BoardState} The initialized board state containing all cells.
 * @throws {Error} If the parameters is invalid.
 */
function createBoard(board) {
  if (!board || !(board instanceof HTMLElement)) {
    throw new Error(
      "Invalid parameters: CSS grid container and board size are required."
    );
  }
  const cells = [];
  const fragment = document.createDocumentFragment();
  // Create the board using a document fragment for better performance
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const cell = new GridCell(i, j, true);
      cells.push(cell);
      fragment.appendChild(cell.domEl);
      if ((i + j) % 2 === 0) {
        cell.addClass("tileColor1");
      } else {
        cell.addClass("tileColor2");
      }
    }
  }
  const domBoardState = new BoardState(
    cells,
    createPlayer(),
    true,
    false,
    false
  );
  domBoardState.cells
    .filter((cell) => cell.row === 0)
    .forEach((cell) => {
      cell.svgLayout.push(PLAYER_ID.USER);
      cell.direction = 1;
      cell.updateSvg();
    });
  domBoardState.cells
    .filter((cell) => cell.row === 1)
    .forEach((cell) => {
      cell.svgLayout.push(PLAYER_ID.USER);
      cell.direction = 1;
      cell.updateSvg();
    });
  domBoardState.cells
    .filter((cell) => cell.row === 6 - 1)
    .forEach((cell) => {
      cell.svgLayout.push(PLAYER_ID.BOT);
      cell.direction = -1;
      cell.updateSvg();
    });
  domBoardState.cells
    .filter((cell) => cell.row === 6 - 2)
    .forEach((cell) => {
      cell.svgLayout.push(PLAYER_ID.BOT);
      cell.direction = -1;
      cell.updateSvg();
    });
  // Append the fragment to the board
  board.appendChild(fragment);
  return domBoardState;
}

/**
 * Creates a sidebar for a player on the left or right hand side of the bord. This sidebar reflects graphically the current
 * player's game state.
 *
 * @param {Player} player - The player for that this sidebar is created.
 * @param {HTMLDivElement|null} - The anchor html element containing this sidebar.
 * @returns {Promise<void>}
 *
 */
function createSidebar(player, anchor) {
  const sidebar = new Sidebar(player, anchor);
}

/**
 * Creates and returns a new PlayerState instance with both players:
 * one player (active, not AI) and one player (inactive, AI).
 *
 * @returns {PlayerState} The initialized PlayerState containing two players.
 */
function createPlayer() {
  const twoPlayer = [];
  twoPlayer.push(new Player(PLAYER_ID.BOT, true, false));
  twoPlayer.push(new Player(PLAYER_ID.USER, false, true));
  const playerState = new PlayerState(twoPlayer);
  return playerState;
}

/**
 * Handles the mouse hover event on entry of a cell in the BoardState.
 * It highlights the hovered cell and its valid neighboring cells for the current player.
 *
 * @param {GridCell} hoveredCell
 * @param {BoardState} domBoardState
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

/**
 * Resets the game state for all DOM elements, Event Handlers and instances.
 * @param {BoardState} domBoardState
 * @returns {void}
 */
function resetGame(domBoardState) {
  domBoardState.cells.forEach((cell) => {
    cell.svgLayout = [];
    cell.updateSvg();
    cell.direction = 0;
    cell.dot = false;
  });
  domBoardState.playerState.twoPlayer.forEach((player) => {
    if (player.id === PLAYER_ID.BOT) {
      player.turn = false;
    } else {
      player.turn = true;
    }
    player.lastHorizontal = false;
    player.securedTower = 0;
    player.vault.self = 0;
    player.vault.opponent = 0;
    player.winner = false;
    Sidebar.playerMap.get(player).refreshDashboard();
  });
  domBoardState.cells
    .filter((cell) => cell.row === 0)
    .forEach((cell) => {
      cell.svgLayout.push(PLAYER_ID.USER);
      cell.direction = 1;
      cell.updateSvg();
    });
  domBoardState.cells
    .filter((cell) => cell.row === 1)
    .forEach((cell) => {
      cell.svgLayout.push(PLAYER_ID.USER);
      cell.direction = 1;
      cell.updateSvg();
    });
  domBoardState.cells
    .filter((cell) => cell.row === 6 - 1)
    .forEach((cell) => {
      cell.svgLayout.push(PLAYER_ID.BOT);
      cell.direction = -1;
      cell.updateSvg();
    });
  domBoardState.cells
    .filter((cell) => cell.row === 6 - 2)
    .forEach((cell) => {
      cell.svgLayout.push(PLAYER_ID.BOT);
      cell.direction = -1;
      cell.updateSvg();
    });
  enableBoardEvents(domBoardState);
  document.querySelector(".board").classList.remove("filterGray");
  domBoardState.waitForWebWorker = false;
}

/**
 * Enable all UI events for the next move after the AI processing of the spawned Web Worker.
 * @param {Worker} worker
 * @param {BoardState} domBoardState
 * @returns {void}
 */
function initWorkerHandler(worker, domBoardState) {
  worker.addEventListener("message", (event) => {
    let srcCellId = event.data[0]._id;
    let tgtCellId = event.data[1]._id;
    srcCellId ??= null;
    tgtCellId ??= null;
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
    domBoardState.applyMoveAndTurn(moveBotSrcInst, moveBotTgtInst);
    const player = domBoardState.playerState.twoPlayer.find(
      (player) => player.turn === false
    );
    Sidebar.playerMap.get(player).refreshDashboard();
    domBoardState.waitForWebWorker = false;
    if (checkWin(domBoardState, player)) {
      document.querySelector(".board").classList.add("filterGray");
      Sidebar.playerMap.get(player).refreshDashboard();
    } else {
      // Enable board events for the next move
      enableBoardEvents(domBoardState);
    }
  });
}

/**
 * Initializes event handlers for the game board, enabling interactive cell selection,
 * highlighting, and move execution for both (player and bot).
 *
 * @param {HTMLElement} domBoard - The DOM element representing the game board.
 * @param {BoardState} domBoardState - The initialized board state containing all cells and player information.
 * @param {Worker} worker - The spawned Web Worker instance that handles AI logic.
 * @returns {void}
 */
function initBoardEventHandlers(domBoard, domBoardState, worker, navbar) {
  domBoard.addEventListener("mouseover", (event) => {
    const currentPlayer = domBoardState.playerState.twoPlayer.find(
      (player) => player.turn === true
    );
    let hoveredCell = domBoardState.mapDomElement.get(
      event.target.closest(".boardCell")
    );
    hoveredCell ??= null;
    if (
      domBoardState.disableBoardEvents === true ||
      hoveredCell === null ||
      !hoveredCell instanceof GridCell ||
      hoveredCell.svgLayout.length === 0 ||
      hoveredCell.svgLayout.at(-1) !== currentPlayer.id
    ) {
      return;
    }
    handleHoveredCellIn(hoveredCell, domBoardState, currentPlayer);
  });

  domBoard.addEventListener("mouseout", (event) => {
    const currentPlayer = domBoardState.playerState.twoPlayer.find(
      (player) => player.turn === true
    );
    let hoveredCell = domBoardState.mapDomElement.get(
      event.target.closest(".boardCell")
    );
    hoveredCell ??= null;
    if (
      domBoardState.disableBoardEvents === true ||
      hoveredCell === null ||
      !hoveredCell instanceof GridCell ||
      hoveredCell.svgLayout.length === 0 ||
      hoveredCell.svgLayout.at(-1) !== currentPlayer.id
    ) {
      return;
    }
    handleHoveredCellOut();
  });

  domBoard.addEventListener("click", function (event) {
    // Return if this event is not fired for playing a new move
    let clickedCell = domBoardState.mapDomElement.get(
      event.target.closest(".boardCell")
    );
    clickedCell ??= null;
    if (
      domBoardState.disableBoardEvents === true ||
      clickedCell === null ||
      !clickedCell instanceof GridCell ||
      prepareMoveForCell(clickedCell, domBoardState) === true ||
      discardMoveForCell(clickedCell, domBoardState) === true ||
      !clickedCell.domEl.classList.contains("click")
    ) {
      return;
    }
    // Main game event loop starts here
    const markedCell = domBoardState.mapDomElement.get(
      document.querySelector(".mark")
    );
    // Play move, update BoardState and turn player
    domBoardState.applyMoveAndTurn(markedCell, clickedCell);
    disableBoardEvents(domBoardState);
    discardBoardAnimations();
    let player = domBoardState.playerState.twoPlayer.find(
      (player) => player.turn === false
    );
    Sidebar.playerMap.get(player).refreshDashboard();
    // interactive player has won?
    if (checkWin(domBoardState, player)) {
      document.querySelector(".board").classList.add("filterGray");
      Sidebar.playerMap.get(player).refreshDashboard();
    } else {
      // Dispatch worker for AI processing
      domBoardState.waitForWebWorker = true;
      worker.postMessage(domBoardState.cloneInstance());
    }
  });
}

/**
 * Initializes event handlers for the game board, enabling interactive cell selection,
 * highlighting, and move execution for both (player and bot).
 *
 * @param {HTMLDivElement} navbar - The DOM element representing the navigation bar above the game board.
 * @returns {void}
 */
function initNavbarEventHandlers(domBoardState, navbar) {
  navbar.addEventListener("click", (event) => {
    let clickedCell = event.target.closest("div");
    clickedCell ??= null;
    if (
      domBoardState.waitForWebWorker === true ||
      clickedCell === null ||
      !clickedCell instanceof HTMLDivElement ||
      (!clickedCell.classList.contains("navbarRestart") &&
        !clickedCell.classList.contains("navbarSettings") &&
        !clickedCell.classList.contains("navbarDatabase"))
    ) {
      return;
    }
    Array.from(clickedCell.classList).forEach((className) => {
      switch (className) {
        case "navbarRestart":
          resetGame(domBoardState);
          break;
        case "navbarSettings":
          window.location.hash = "#sectSettings";
          break;
      }
    });
  });
}

/**
 * Initializes event handlers for each same origin section fragment targeted by the navbar.
 *
 * @returns {void}
 */
function initSectionEventHandlers() {}

/**
 * Main entry point for the game.
 */
window.addEventListener(
  "DOMContentLoaded",
  /* async */ () => {
    try {
      window.location.hash = "#sectHome";
      if (!window.Worker) {
        throw new Error(
          "Web Workers are not supported in this browser. Please use a modern browser."
        );
      }
      GridCell.svgTowerVector = createSvgTowerVector();
      const domBoard = document.getElementById("board");
      const domBoardState = createBoard(board, 6);
      const navbar = document.querySelector(".navbar");
      const bot = domBoardState.playerState.twoPlayer.find(
        (player) => player.id === PLAYER_ID.BOT
      );
      const user = domBoardState.playerState.twoPlayer.find(
        (player) => player.id === PLAYER_ID.USER
      );
      /* await */ createSidebar(bot, document.querySelector(".sidebarBot"));
      /* await */ createSidebar(user, document.querySelector(".sidebarUser"));
      const worker = new Worker("./modules/WebWorker.js", { type: "module" });
      initWorkerHandler(worker, domBoardState);
      initBoardEventHandlers(domBoard, domBoardState, worker);
      initNavbarEventHandlers(domBoardState, navbar);
      initSectionEventHandlers();
    } catch (error) {
      console.error(error);
    }
  }
);
