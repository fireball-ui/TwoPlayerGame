/**
 * @module ReplayhistoryEventLoop
 * @description
 * @requires module:Logger
 */

import { LoggerReader } from "./Logger.js";

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
  } catch (error) {
    throw new Error(JSON.stringify(structuredClone(error)));
  }
}

function updateSvg(domEl, svgLayout, dot) {
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
}

function prettifyMoveNumber(moveNo) {
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
}

export { loadGameHistoryMove, updateSvg };
