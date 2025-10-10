/**
 * @module ReplayhistoryEventLoop
 * @description
 * @requires module:Logger
 */

import { LoggerWriter, LoggerReader } from "./Logger.js";
import { PLAYER_ID, BoardState, Sidebar } from "./GameState.js";
import { resetGame } from "./GameEventLoop.js";

async function loadGameHistoryMove(advanceSteps) {
  try {
    if (
      LoggerReader.instances.size === 0 ||
      !LoggerReader.currentSelectedInstance
    ) {
      return;
    }
    const loggerReader = LoggerReader.currentSelectedInstance;
    const record = await loggerReader.fetchRecord(advanceSteps);
    const gridCells = record.boardState._cells;
    const domChildren = Array.from(LoggerReader.historyBoard.children);
    domChildren.forEach((domGridItem, index) => {
      domGridItem.classList.remove("mark", "click");
      const gridCell = gridCells[index];
      const svgLayout = gridCell._svgLayout;
      const hasDot = gridCell._dot;
      updateSvg(domGridItem, svgLayout, hasDot);
    });
    if (record.lastMove) {
      const moveSrcCell = record.lastMove._srcCell;
      const moveTgtCell = record.lastMove._tgtCell;
      const moveSrcDomCell = domChildren.find((cell, index) => {
        if (index === moveSrcCell._id) {
          return true;
        }
      });
      const moveTgtDomCell = domChildren.find((cell, index) => {
        if (index === moveTgtCell._id) {
          return true;
        }
      });
      moveSrcDomCell.classList.add("mark");
      moveTgtDomCell.classList.add("click");
    }
    prettifyMoveNumber(record.move);
    refreshSidebars(record.boardState._playerState);
    updateLastBotMove(record.move, record.boardState._playerState);
  } catch (error) {
    console.error(error.message);
    throw new Error(JSON.stringify(structuredClone(error)));
  }
}

function updateSvg(domEl, svgLayout, dot) {
  try {
    let svgLayoutString;
    if (svgLayout.length === 0) {
      svgLayoutString = "none";
    } else {
      svgLayoutString = svgLayout.join("_");
      if (dot === true) {
        svgLayoutString += "_dot";
      }
    }
    const svgSymbol = `tower_${svgLayoutString}`;
    domEl
      .querySelector("use")
      .setAttribute("href", `./images/pieces.svg#${svgSymbol}`);
  } catch (error) {
    console.error(error.message);
    throw new Error(JSON.stringify(structuredClone(error)));
  }
}

function prettifyMoveNumber(moveNo) {
  try {
    const hundreds = Math.floor(moveNo / 100);
    const tens = Math.floor((moveNo % 100) / 10);
    const ones = moveNo % 10;
    document
      .querySelector(".navbarReplayMoveHundreds > svg > use")
      .setAttribute("href", `./images/icons.svg#icon_digit_${hundreds}`);
    document
      .querySelector(".navbarReplayMoveTens > svg > use")
      .setAttribute("href", `./images/icons.svg#icon_digit_${tens}`);
    document
      .querySelector(".navbarReplayMoveOnes > svg > use")
      .setAttribute("href", `./images/icons.svg#icon_digit_${ones}`);
  } catch (error) {
    console.error(error.message);
    throw new Error(JSON.stringify(structuredClone(error)));
  }
}

function refreshSidebars(playerState) {
  try {
    const logRecordDataUser = playerState._twoPlayer.find(
      (player, _) => player._id === PLAYER_ID.USER
    );
    const logRecordDataBot = playerState._twoPlayer.find(
      (player, _) => player._id === PLAYER_ID.BOT
    );
    const playerUser = LoggerReader.playerHistoryUser;
    const playerBot = LoggerReader.playerHistoryBot;
    playerUser.turn = logRecordDataUser._turn;
    playerUser.lastHorizontal = logRecordDataUser._lastHorizontal;
    playerUser.safetyTower = logRecordDataUser._safetyTower;
    playerUser.vault = logRecordDataUser._vault;
    playerUser.winner = logRecordDataUser._winner;
    playerBot.turn = logRecordDataBot._turn;
    playerBot.lastHorizontal = logRecordDataBot._lastHorizontal;
    playerBot.safetyTower = logRecordDataBot._safetyTower;
    playerBot.vault = logRecordDataBot._vault;
    playerBot.winner = logRecordDataBot._winner;
    Sidebar.playerMapHistory.get(playerUser).refreshDashboard();
    Sidebar.playerMapHistory.get(playerBot).refreshDashboard();
    if (playerUser.turn === false) {
      Sidebar.playerMapHistory.get(playerUser).markDashboard();
      Sidebar.playerMapHistory.get(playerBot).unmarkDashboard();
    } else {
      Sidebar.playerMapHistory.get(playerBot).markDashboard();
      Sidebar.playerMapHistory.get(playerUser).unmarkDashboard();
    }
  } catch (error) {
    console.error(error.message);
    throw new Error(JSON.stringify(structuredClone(error)));
  }
}

function updateLastBotMove(moveNo, playerState) {
  const helperDiv = document.querySelector(
    "#sectReplayLogger .panelReplayCommit"
  );
  const helperHeader = helperDiv.querySelector(".headerReplayRequest");
  if (isNaN(moveNo) || moveNo <= 1) {
    helperDiv.setAttribute("data-last-bot-move", "");
    return;
  }
  const logRecordDataBot = playerState._twoPlayer.find(
    (player, _) => player._id === PLAYER_ID.BOT
  );
  if (!logRecordDataBot || logRecordDataBot._turn === true) {
    return;
  }
  helperHeader.textContent = `Replay after Last bot move #${moveNo} ?`;
  helperDiv.setAttribute("data-last-bot-move", String(moveNo));
}

function replayToSelectedBoardState(record, domBoardState) {
  try {
    const newBoardState = BoardState.createFromStructuredClone(
      record.boardState
    );
    const newPlayerBot = newBoardState.playerState.twoPlayer.find(
      (player) => player.id === PLAYER_ID.BOT
    );
    const newPlayerUser = newBoardState.playerState.twoPlayer.find(
      (player) => player.id === PLAYER_ID.USER
    );
    domBoardState.cells.forEach((cell, index) => {
      const newCell = newBoardState._cells[index];
      cell.svgLayout = newCell._svgLayout;
      cell.direction = newCell._direction;
      cell.dot = newCell._dot;
      cell.updateSvg();
    });
    domBoardState.playerState.twoPlayer.forEach((player) => {
      if (player.id === PLAYER_ID.BOT) {
        player.turn = newPlayerBot.turn;
        player.lastHorizontal = newPlayerBot.lastHorizontal;
        player.safetyTower = newPlayerBot.safetyTower;
        player.vault = newPlayerBot.vault;
        player.winner = newPlayerBot.winner;
        Sidebar.playerMap.get(player).unmarkDashboard();
      }
      if (player.id === PLAYER_ID.USER) {
        player.turn = newPlayerUser.turn;
        player.lastHorizontal = newPlayerUser.lastHorizontal;
        player.safetyTower = newPlayerUser.safetyTower;
        player.vault = newPlayerUser.vault;
        player.winner = newPlayerUser.winner;
        Sidebar.playerMap.get(player).markDashboard();
      }
      Sidebar.playerMap.get(player).refreshDashboard();
    });
  } catch (error) {
    console.error(error.message);
  }
}

async function dialogSelectBtnEventHandler(event) {
  try {
    const btn = event.target.closest(".selectGameId");
    if (!btn || !(btn instanceof HTMLButtonElement)) {
      return;
    }
    const panel = btn.closest(".panelGameId");
    if (!panel || !(panel instanceof HTMLDivElement)) {
      throw new Error("cannot relocate scroll itemn panel for game replay");
    }
    const dialog = panel.closest(".dialogUploadModal");
    if (!dialog || !dialog instanceof HTMLDialogElement) {
      throw new Error("cannot relocate dialog element for game replay");
    }
    let gameId = panel.getAttribute("data-db-key");
    if (!gameId || isNaN(gameId)) {
      dialog.close();
      return;
    }
    gameId = Number(gameId);
    LoggerReader.currentSelectedInstance = LoggerReader.instances.get(gameId);
    await loadGameHistoryMove(Infinity);
    dialog.close();
  } catch (error) {
    console.error(error.message);
  }
}

async function dialogCommitBtnEventHandler(event) {
  try {
    const btnConfirm = event.target.closest(".confirmReplayRequest");
    const btnCancel = event.target.closest(".cancelReplayRequest");
    const clickedBtn = btnConfirm || btnCancel;
    if (!clickedBtn || !(clickedBtn instanceof HTMLButtonElement)) {
      return;
    }
    const panel = clickedBtn.closest(".panelReplayCommit");
    if (!panel || !(panel instanceof HTMLDivElement)) {
      throw new Error("cannot relocate scroll item panel for game replay");
    }
    const dialog = panel.closest(".dialogReplayCommit");
    if (!dialog || !dialog instanceof HTMLDialogElement) {
      throw new Error("cannot relocate dialog element for game replay");
    }
    if (btnCancel && btnCancel instanceof HTMLButtonElement) {
      dialog.close();
      return;
    }
    if (btnConfirm && btnConfirm instanceof HTMLButtonElement) {
      const lastBotMove = Number(panel.getAttribute("data-last-bot-move"));
      if (isNaN(lastBotMove) || lastBotMove <= 1) {
        dialog.close();
        return;
      }
      const reader = LoggerReader.currentSelectedInstance;
      if (!reader) {
        throw new Error("no logger reader instance selected for game replay");
      }
      await reader.fetchRecord(-Infinity);
      const record = await reader.fetchRecord(lastBotMove);
      resetGame(
        BoardState.currentLiveInstance,
        LoggerWriter.currentLiveInstance
      );
      replayToSelectedBoardState(record, BoardState.currentLiveInstance);
      window.location.hash = "#sectHome";
      dialog.close();
    }
  } catch (error) {
    console.error(error.message);
  }
}

export {
  loadGameHistoryMove,
  updateSvg,
  dialogSelectBtnEventHandler,
  dialogCommitBtnEventHandler,
};
