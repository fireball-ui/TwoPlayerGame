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
 * @requires module:AsyncAPIWrapper
 * @requires module:ConfigState
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
import {
  dispatchWorker,
  workerMessageScheme,
  cssTransitionEnded,
} from "./modules/AsyncAPIWrapper.js";
import { Settings } from "./modules/ConfigState.js";

/**
 * Creates a game board by generating a grid of cells, initializing their state,
 * and appending them to the provided board element. Also sets up initial player positions.
 *
 * @param {HTMLElement} board - The CSS grid container DOM element to which the cells will be appended.
 * @returns {BoardState} The initialized board state containing all cells.
 * @throws {Error} If the parameters is invalid.
 */
function createBoard(domBoard) {
  const cells = [];
  Array.from(domBoard.children).forEach((domCell, index) => {
    const column = index % 6;
    const row = Math.round((index - column) / 6);
    const cell = new GridCell(row, column, true, domCell);
    cells.push(cell);
  });
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
function handleHoveredCellOut(domBoardState) {
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
    player.safetyTower = 0;
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
 * Handle UI logic after the database worker has sent a message,
 * either for logging the current game state or for saving game settings customization.
 * @param {Worker} dbWorker
 * @param {BoardState} domBoardState
 * @returns {void}
 */
function initDbWorkerHandler(dbWorker) {
  dbWorker.addEventListener("message", (event) => {
    if (event.data.error === true) {
      throw new Error("Error in dbWorker: " + event.data);
    }
  });
  dbWorker.addEventListener("error", (event) => {
    throw new Error(
      "Uncaught error in dbWorker: " + event.error + " " + event.message
    );
  });
}
/**
 * Initializes event handlers for the game board, enabling interactive cell selection,
 * highlighting, and move execution for both (player and bot).
 *
 * @param {HTMLElement} domBoard - The DOM element representing the game board.
 * @param {BoardState} domBoardState - The initialized board state containing all cells and player information.
 * @param {Worker} aiWorker - The spawned Web Worker instance that handles AI logic.
 * @returns {void}
 */
function initBoardEventHandlers(domBoard, domBoardState, aiWorker, settings) {
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
      hoveredCell.svgLayout.at(-1) !== currentPlayer.id ||
      hoveredCell.domEl.classList.contains("select")
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
    handleHoveredCellOut(domBoardState);
  });

  domBoard.addEventListener("click", async (event) => {
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
    // Play move, update BoardState, update Sidebar and turn player
    domBoardState.applyMoveAndTurn(markedCell, clickedCell);
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
      //animate css load spinner
      document.querySelectorAll(".CSSloadSpinner g").forEach((svgGelement) => {
        svgGelement.classList.remove("svgHide");
      });
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
      document.querySelectorAll(".CSSloadSpinner g").forEach((svgGelement) => {
        svgGelement.classList.add("svgHide");
      });
      // trigger animations for this bot's move and wait for the end of the css transitions
      await cssTransitionEnded(moveBotSrcInst.domEl, "select");
      await cssTransitionEnded(moveBotTgtInst.domEl, "hover");
      // apply move
      domBoardState.applyMoveAndTurn(moveBotSrcInst, moveBotTgtInst);
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
 * Initializes all input range values from the Settings object store in the database.
 * @param {Array<HTMLInputElement>} inputs - All html input range elements from the settings section
 * @param {Array<HTMLOutputElement>} outputs - All html output elements from the settings section
 * @returns {void}
 */
async function initRangeSlidersFromDb(settings, inputs, outputs) {
  try {
    inputs.forEach((input, index) => {
      switch (input.id) {
        case "safetyTowers":
          input.value = String(settings.winningRules.settings.safetyZone);
          break;
        case "opponentStones":
          input.value = String(settings.winningRules.settings.materialOpponent);
          break;
        case "searchDepth":
          input.value = String(settings.searchRules.settings.depth);
          break;
        case "searchTimeout":
          input.value = String(settings.searchRules.settings.timeout);
          break;
        case "materialAdvantageConquered":
          input.value = String(
            settings.materialAdvantageConquered.settings.totalWeight
          );
          break;
        case "safetyZone1":
          input.value = String(
            settings.safetyZoneProximity.settings.weightRowDistance1
          );
          break;
        case "safetyZone2":
          input.value = String(
            settings.safetyZoneProximity.settings.weightRowDistance2
          );
          break;
        case "safetyZone3":
          input.value = String(
            settings.safetyZoneProximity.settings.weightRowDistance3
          );
          break;
        case "safetyZone4":
          input.value = String(
            settings.safetyZoneProximity.settings.weightRowDistance4
          );
          break;
        case "safetyZone5":
          input.value = String(
            settings.safetyZoneProximity.settings.weightRowDistance5
          );
          break;
        case "safetyZoneTotalWeight":
          input.value = String(
            settings.safetyZoneProximity.settings.totalWeight
          );
          break;
        case "materialAdvantageAccounted":
          input.value = String(
            settings.materialAdvantageAccounted.settings.totalWeight
          );
          break;
        default:
          throw new Error("unknown input element");
      }
      outputs.at(index).textContent = input.value;
    });
  } catch (error) {
    console.log(error);
  }
}

/**
 * This function:
 * - Initially loads the persistent settings from the database and updates all input values.
 * - Adds an event handler delegator for the input event inside this html section.
 * This event handler simply updates the text context of the output element,
 * whenver the input value changes for a specific range slider.
 * - Adds an event handler delegator for the click event inside this hmtl section.
 * By clicking on the save icon, the properties of the settings instance are updated and
 * all input values are saved to the database.
 * By clicking on the recycle icon, the factory defualt settings are restored
 * for the database and all properties of the settings instance.
 *
 * @param {Settings} settings - The Worker instance handling the db operations.
 * @returns {void}
 */
async function initSectionSettings(settings) {
  try {
    /* load settings from database and init all range slider values */
    await settings.load();
    const domSettings = document.getElementById("sectSettings");
    const inputs = Array.from(domSettings.getElementsByTagName("input"));
    const outputs = Array.from(domSettings.getElementsByTagName("output"));
    initRangeSlidersFromDb(settings, inputs, outputs);
    domSettings.addEventListener("input", (event) => {
      try {
        const form = event.target.closest(".panel");
        const inputs = Array.from(form.getElementsByTagName("input"));
        const outputs = Array.from(form.getElementsByTagName("output"));
        inputs.forEach((input, index) => {
          outputs.at(index).textContent = input.value;
        });
      } catch (error) {
        console.log(error);
      }
    });
    domSettings.addEventListener("click", async (event) => {
      try {
        const navIcon = event.target.closest("svg");
        if (
          !navIcon ||
          (!navIcon.classList.contains("iconSave") &&
            !navIcon.classList.contains("iconRecycle"))
        ) {
          return;
        }
        if (navIcon.classList.contains("iconSave")) {
          const inputs = Array.from(domSettings.getElementsByTagName("input"));
          const newWinningRules = structuredClone(Settings.factoryWinningRules);
          const newSearchRules = structuredClone(Settings.factorySearchRules);
          const newMaterialAdvantageConquered = structuredClone(
            Settings.factoryMaterialAdvantageConquered
          );
          const newSafetyZoneProximity = structuredClone(
            Settings.factorySafetyZoneProximity
          );
          const newMaterialAdvantageAccounted = structuredClone(
            Settings.factoryMaterialAdvantageAccounted
          );
          inputs.forEach((input, _) => {
            switch (input.id) {
              case "safetyTowers":
                newWinningRules.settings.safetyZone = Number(input.value);
                break;
              case "opponentStones":
                newWinningRules.settings.materialOpponent = Number(input.value);
                break;
              case "searchDepth":
                newSearchRules.settings.depth = Number(input.value);
                break;
              case "searchTimeout":
                newSearchRules.settings.timeout = Number(input.value);
                break;
              case "materialAdvantageConquered":
                newMaterialAdvantageConquered.settings.totalWeight = Number(
                  input.value
                );
                break;
              case "safetyZone1":
                newSafetyZoneProximity.settings.weightRowDistance1 = Number(
                  input.value
                );
                break;
              case "safetyZone2":
                newSafetyZoneProximity.settings.weightRowDistance2 = Number(
                  input.value
                );
                break;
              case "safetyZone3":
                newSafetyZoneProximity.settings.weightRowDistance3 = Number(
                  input.value
                );
                break;
              case "safetyZone4":
                newSafetyZoneProximity.settings.weightRowDistance4 = Number(
                  input.value
                );
                break;
              case "safetyZone5":
                newSafetyZoneProximity.settings.weightRowDistance5 = Number(
                  input.value
                );
                break;
              case "safetyZoneTotalWeight":
                newSafetyZoneProximity.settings.totalWeight = Number(
                  input.value
                );
                break;
              case "materialAdvantageAccounted":
                newMaterialAdvantageAccounted.settings.totalWeight = Number(
                  input.value
                );
                break;
              default:
                throw new Error("unknown input element");
            }
          });
          settings.winningRules = newWinningRules;
          settings.searchRules = newSearchRules;
          settings.materialAdvantageConquered = newMaterialAdvantageConquered;
          settings.safetyZoneProximity = newSafetyZoneProximity;
          settings.materialAdvantageAccounted = newMaterialAdvantageAccounted;
          await settings.save();
        }
        if (navIcon.classList.contains("iconRecycle")) {
          await settings.restoreFactoryDefault();
          initRangeSlidersFromDb(settings, inputs, outputs);
        }
      } catch (error) {
        console.log(error);
      }
    });
  } catch (error) {
    console.log(error);
  }
}

/**
 * Main entry point for the game.
 */
window.addEventListener(/*"DOMContentLoaded"*/ "load", async () => {
  try {
    window.location.hash = "#sectHome";
    if (!window.Worker) {
      throw new Error(
        "Web Workers are not supported in this browser. Please use a modern browser."
      );
    }
    const domBoard = document.querySelector(".board");
    const domBoardState = createBoard(domBoard);
    const navbar = document.querySelector(".navbar");
    const bot = domBoardState.playerState.twoPlayer.find(
      (player) => player.id === PLAYER_ID.BOT
    );
    const user = domBoardState.playerState.twoPlayer.find(
      (player) => player.id === PLAYER_ID.USER
    );
    createSidebar(bot, document.querySelector(".sidebarBot"));
    createSidebar(user, document.querySelector(".sidebarUser"));
    const aiWorker = new Worker("./modules/AiWorker.js", { type: "module" });
    const dbWorker = new Worker("./modules/DbWorker.js", { type: "module" });
    //open IndexedDB database
    const dbWorkerRequest = structuredClone(workerMessageScheme);
    dbWorkerRequest.request.type = "open";
    const dbWorkerResponse = await dispatchWorker(dbWorker, dbWorkerRequest);
    if (dbWorkerResponse.response.error === true) {
      throw new Error(
        "Caught error in db worker for open database request: " +
          dbWorkerResponse.response.message
      );
    }
    const settings = new Settings(dbWorker);
    initSectionSettings(settings);
    initBoardEventHandlers(domBoard, domBoardState, aiWorker, settings);
    initNavbarEventHandlers(domBoardState, navbar);
  } catch (error) {
    console.error(error);
  }
});
window.addEventListener("error", (event) => {
  console.log(event);
});
window.addEventListener("unhandledrejection", (event) => {
  console.log(event);
});
