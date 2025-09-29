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
import {
  dispatchWorker,
  workerMessageScheme,
} from "./modules/AsyncAPIWrapper.js";
import { Settings } from "./modules/ConfigState.js";
import {
  enableBoardEvents,
  handleHoveredCellIn,
  handleHoveredCellOut,
  prepareMoveForCell,
  discardMoveForCell,
  playUserMove,
} from "./modules/GameEventLoop.js";
import {
  LoggerWriter,
  LoggerReader,
  cacheAllIndexKeys,
  cacheKeysFromIndex,
} from "./modules/Logger.js";
import {
  loadGameHistoryMove,
  updateSvg,
  dialogBtnEventHandler,
} from "./modules/ReplayHistoryEventLoop.js";
let aiWorker;
let dbWorker;
let isFatalError = false;

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
  const svg1 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg1.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg1.setAttribute("viewBox", "0 0 100 100");
  svg1.classList.add(
    "fillColorUser",
    "fillColorBot",
    "fillColorDot",
    "strokeColor"
  );
  const use1 = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use1.setAttribute("href", "./images/pieces.svg#tower_none");
  svg1.appendChild(use1);

  Array.from(domBoard.children).forEach((domCell, index) => {
    domCell.appendChild(svg1.cloneNode(true));
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
 * Creates a game board by generating a grid of cells, initializing their state,
 * and appending them to the provided board element. Also sets up initial player positions.
 *
 * @param {HTMLElement} board - The CSS grid container DOM element to which the cells will be appended.
 * @returns {BoardState} The initialized board state containing all cells.
 * @throws {Error} If the parameters is invalid.
 */
function createHistoryBoard(domBoardState) {
  const historyBoard = document
    .getElementById("sectReplayLogger")
    .querySelector(".board");
  const svg1 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg1.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg1.setAttribute("viewBox", "0 0 100 100");
  svg1.classList.add(
    "fillColorUser",
    "fillColorBot",
    "fillColorDot",
    "strokeColor"
  );
  const use1 = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use1.setAttribute("href", "./images/pieces.svg#tower_none");
  svg1.appendChild(use1);

  Array.from(historyBoard.children).forEach((domCell, index) => {
    domCell.appendChild(svg1.cloneNode(true));
  });
  Array.from(historyBoard.children).forEach((domCell, index) => {
    const domBoardCell = domBoardState.cells[index];
    updateSvg(domCell, domBoardCell.svgLayout, domBoardCell.dot);
  });
  return historyBoard;
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
function createSidebar(player, anchor, history) {
  const sidebar = new Sidebar(player, anchor, history);
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
 * Resets the game state for all DOM elements, Event Handlers and instances.
 * @param {BoardState} domBoardState
 * @returns {void}
 */
function resetGame(domBoardState, loggerWriter) {
  domBoardState.cells.forEach((cell) => {
    cell.svgLayout = [];
    cell.updateSvg();
    cell.direction = 0;
    cell.dot = false;
  });
  domBoardState.playerState.twoPlayer.forEach((player) => {
    if (player.id === PLAYER_ID.BOT) {
      player.turn = false;
      Sidebar.playerMap.get(player).unmarkDashboard();
    } else {
      player.turn = true;
      Sidebar.playerMap.get(player).markDashboard();
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
  loggerWriter.gameId = Date.now();
  loggerWriter.move = 0;
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
function initBoardEventHandlers(
  domBoard,
  domBoardState,
  aiWorker,
  settings,
  loggerWriter
) {
  domBoard.addEventListener("mouseover", (event) => {
    try {
      if (isFatalError) {
        return;
      }
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
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  });

  domBoard.addEventListener("mouseout", (event) => {
    try {
      if (isFatalError) {
        return;
      }
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
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  });

  domBoard.addEventListener("click", async (event) => {
    try {
      if (isFatalError) {
        return;
      }
      // Return if this event is not fired for playing a new move
      let clickedCell = domBoardState.mapDomElement.get(
        event.target.closest(".boardCell")
      );
      clickedCell ??= null;
      if (
        domBoardState.disableBoardEvents === true ||
        clickedCell === null ||
        !clickedCell instanceof GridCell ||
        prepareMoveForCell(clickedCell) === true ||
        discardMoveForCell(clickedCell) === true ||
        !clickedCell.domEl.classList.contains("click")
      ) {
        return;
      }
      await playUserMove(
        domBoardState,
        settings,
        aiWorker,
        loggerWriter,
        clickedCell
      );
    } catch (error) {
      console.error(error);
      throw new Error(error);
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
function initNavbarEventHandlers(domBoardState, loggerWriter, navbar) {
  navbar.addEventListener("click", async (event) => {
    try {
      if (isFatalError) {
        return;
      }
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
      for (const className of clickedCell.classList) {
        switch (className) {
          case "navbarRestart":
            resetGame(domBoardState, loggerWriter);
            break;
          case "navbarSettings":
            window.location.hash = "#sectSettings";
            break;
          case "navbarDatabase":
            if (LoggerReader.instances.size > 0) {
              LoggerReader.currentSelectedInstance = LoggerReader.instances
                .entries()
                .toArray()
                .at(-1)[1];
              await loadGameHistoryMove(Infinity);
            }
            window.location.hash = "#sectReplayLogger";
            break;
          default:
            break;
        }
      }
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  });
}

/**
 * Initializes all input range values from the Settings object store in the database.
 * @param {Array<HTMLInputElement>} inputs - All html input range elements from the settings section
 * @param {Array<HTMLOutputElement>} outputs - All html output elements from the settings section
 * @returns {void}
 */
function initRangeSlidersFromDb(settings, inputs, outputs) {
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

async function loadSettings(settings) {
  try {
    await settings.load();
  } catch (error) {
    throw new Error(JSON.stringify(error));
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
function initSettingsEventHandlers(settings) {
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
      console.log(JSON.stringify(error));
      throw new Error(JSON.stringify(error));
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
              newSafetyZoneProximity.settings.totalWeight = Number(input.value);
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
      console.log(JSON.stringify(error));
      throw new Error(JSON.stringify(error));
    }
  });
}

async function loadReplayLogger() {
  try {
    const allIndexKeys = await cacheAllIndexKeys();
    if (allIndexKeys) {
      for (const gameId of allIndexKeys) {
        const reader = new LoggerReader(gameId);
        const keys = await cacheKeysFromIndex(gameId);
        keys.forEach((key, _) => {
          reader.addPrimaryKey(key);
        });
      }
    }
  } catch (error) {
    console.error(error.message);
    throw new Error(JSON.stringify(structuredClone(error)));
  }
}

/**
 * This function:
 * - Initially loads all game id index keys from the ReplayLogger object store
 *   and creates all corresponding LoggerReader instances.
 * - Adds an event handler delegator for the click event loop inside this hmtl section.
 *   By clicking on the footer buttons, the cursor state for the
 *   ReplayLogger object store is managed. The primary key for this current game history
 *   gets advanced correspondingly and the moves are replayed and printed.
 *   By clicking on the replay button on the top right, the current game is stopped and
 *   resetted and a new game is started at this specific user's move.
 * - By clicking on the upload button, a dialog is opened from where you can select another game history.
 * @returns {void}
 */
async function initReplayLoggerEventHandlers() {
  try {
    const domReplayLogger = document.getElementById("sectReplayLogger");
    domReplayLogger.addEventListener("click", async (event) => {
      try {
        const icon = event.target.closest("svg");
        const gridItem = icon.closest("div");
        if (!icon || !gridItem || !icon.classList.contains("icon2")) {
          return;
        }
        if (gridItem.classList.contains("footerReplayBackwardStep")) {
          await loadGameHistoryMove(-1);
        }
        if (gridItem.classList.contains("footerReplayBackwardFast")) {
          await loadGameHistoryMove(-Infinity);
        }
        if (gridItem.classList.contains("footerReplayForwardStep")) {
          await loadGameHistoryMove(1);
        }
        if (gridItem.classList.contains("footerReplayForwardFast")) {
          await loadGameHistoryMove(Infinity);
        }
        if (gridItem.classList.contains("navbarUploadModal")) {
          const dialogForGameReplay = gridItem.querySelector("dialog");
          if (!dialogForGameReplay) {
            throw new Error("cannot relocate dialog element");
          }
          dialogForGameReplay.showModal();
        }
      } catch (error) {
        console.error(error.message);
      }
    });
    const gameReplayScrollContainer = document.querySelector(
      "#sectReplayLogger .navbarUploadModal dialog main"
    );
    if (!gameReplayScrollContainer) {
      throw new Error("cannot relocate scroll container for dialog element");
    }
    gameReplayScrollContainer.addEventListener("click", dialogBtnEventHandler);
  } catch (error) {
    console.error(error.message);
  }
}

/**
 * Main entry point for the game.
 */
window.addEventListener("load", async () => {
  try {
    window.location.hash = "#sectHome";
    if (!window.Worker) {
      throw new Error(
        "Web Workers are not supported in this browser. Please use a modern browser."
      );
    }
    const domBoard = document.querySelector(".board");
    const domBoardState = createBoard(domBoard);
    LoggerReader.initialDomBoardState = domBoardState.cloneInstance();
    LoggerReader.historyBoard = createHistoryBoard(domBoardState);
    LoggerReader.scrollItemTemplate = document.querySelector(
      "#sectReplayLogger .navbarUploadModal template"
    );
    LoggerReader.scrollContainer = document.querySelector(
      "#sectReplayLogger .navbarUploadModal main"
    );
    const navbar = document.querySelector(".navbar");
    const bot = domBoardState.playerState.twoPlayer.find(
      (player) => player.id === PLAYER_ID.BOT
    );
    const user = domBoardState.playerState.twoPlayer.find(
      (player) => player.id === PLAYER_ID.USER
    );
    createSidebar(bot, document.querySelector("#sectHome .sidebarBot"), false);
    createSidebar(
      user,
      document.querySelector("#sectHome .sidebarUser"),
      false
    );
    Sidebar.playerMap.get(user).markDashboard();
    Sidebar.playerMap.get(bot).unmarkDashboard();
    const playerStateHistory = createPlayer();
    const botHistory = playerStateHistory.twoPlayer.find(
      (player) => player.id === PLAYER_ID.BOT
    );
    const userHistory = playerStateHistory.twoPlayer.find(
      (player) => player.id === PLAYER_ID.USER
    );
    createSidebar(
      botHistory,
      document.querySelector("#sectReplayLogger .sidebarBot"),
      true
    );
    createSidebar(
      userHistory,
      document.querySelector("#sectReplayLogger .sidebarUser"),
      true
    );
    LoggerReader.playerHistoryBot = botHistory;
    LoggerReader.playerHistoryUser = userHistory;
    aiWorker = new Worker("./modules/AiWorker.js", { type: "module" });
    dbWorker = new Worker("./modules/DbWorker.js", { type: "module" });
    LoggerWriter.dbWorker = dbWorker;
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
    const loggerWriter = new LoggerWriter(domBoardState);
    await loadSettings(settings);
    initSettingsEventHandlers(settings);
    await loadReplayLogger();
    initReplayLoggerEventHandlers();
    initBoardEventHandlers(
      domBoard,
      domBoardState,
      aiWorker,
      settings,
      loggerWriter
    );
    initNavbarEventHandlers(domBoardState, loggerWriter, navbar);
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
});
window.addEventListener("error", (errorEvent) => {
  errorEvent.stopImmediatePropagation();
  isFatalError = true;
  console.error(errorEvent.error);
  console.error(errorEvent.message);
  console.error(error.filename);
  console.error(error.lineno);
  console.error(errorEvent.colno);
  if (dbWorker && dbWorker instanceof Worker) {
    dbWorker.terminate();
  }
  if (aiWorker && aiWorker instanceof Worker) {
    aiWorker.terminate();
  }
});
window.addEventListener("unhandledrejection", (event) => {
  console.error(event.reason);
  console.error(event.promise);
  throw new Error("Promise rejection event, target: " + event.target);
});
