/**
 * @module Logger
 * @description ToDo...
 * @requires module:AsyncAPIWrapper
 * @exports LoggerWriter
 * @exports LOGGER_DB_ITEMS
 * @exports LoggerReader
 */

import {
  dispatchWorker,
  workerMessageScheme,
  handleResponse,
} from "./AsyncAPIWrapper.js";
const LOGGER_DB_ITEMS = Object.freeze({
  OBJECT_STORE: "ReplayLog",
  KEY_PATH: "id",
  INDEX_NAME: "gameId",
});

async function cacheAllIndexKeys() {
  try {
    const request = structuredClone(workerMessageScheme);
    request.request.type = "getAllIndexKeys";
    request.request.parameter.push(LOGGER_DB_ITEMS.OBJECT_STORE);
    request.request.parameter.push(LOGGER_DB_ITEMS.INDEX_NAME);
    const workerResponse = await dispatchWorker(LoggerWriter.dbWorker, request);
    handleResponse(workerResponse);
    return workerResponse.response.message;
  } catch (error) {
    console.log("error logger getAllIndexKeys: " + JSON.stringify(error));
    throw new Error("error logger getAllIndexKeys: " + JSON.stringify(error));
  }
}

async function cacheKeysFromIndex(indexKey) {
  try {
    const request = structuredClone(workerMessageScheme);
    request.request.type = "getKeysFromIndexOnly";
    request.request.parameter.push(LOGGER_DB_ITEMS.OBJECT_STORE);
    request.request.parameter.push(LOGGER_DB_ITEMS.INDEX_NAME);
    request.request.parameter.push(indexKey);
    const workerResponse = await dispatchWorker(LoggerWriter.dbWorker, request);
    handleResponse(workerResponse);
    return workerResponse.response.message;
  } catch (error) {
    console.log("error logger cacheKeysFromIndex: " + JSON.stringify(error));
    throw new Error(
      "error logger cacheKeysFromIndex: " + JSON.stringify(error)
    );
  }
}

/**
 * ToDo...
 *
 * @class
 * @constructor
 */
class LoggerWriter {
  /**
   * The current board state.
   * @private
   * @type {BoardState}
   * @readonly
   */
  _boardState;

  /**
   * The start date for this game.
   * This property maps the gameId index of the ReplayLog object store.
   * @private
   * @type {Number}
   */
  _gameId;

  /**
   * The number of moves currently applied to the game.
   * This property maps the move index of the ReplayLog object store.
   * @private
   * @type {Number}
   */
  _move;

  /**
   * @static
   * @type {Worker}
   */
  static dbWorker;

  /**
   * Creates a new LoggerWriter instance.
   * @constructor
   * @param {BoardState} boardState - The current board state.
   */
  constructor(boardState) {
    if (!LoggerWriter.dbWorker || !(LoggerWriter.dbWorker instanceof Worker)) {
      throw new Error(
        "LoggerWriter: invalid web worker instance for db requests"
      );
    }
    this._boardState = boardState;
    this._gameId = Date.now();
    this._move = 0;
  }

  /**
   * Gets the current board state.
   * @public
   * @type {BoardState}
   * @returns {BoardState}
   * @readonly
   */
  get boardState() {
    return this._boardState;
  }

  /**
   * Gets the current start date for this game.
   * @public
   * @type {Date}
   * @returns {Date}
   * @readonly
   */
  get gameId() {
    return this._gameId;
  }

  /**
   * Gets the current move.
   * @public
   * @type {Number}
   * @returns {Number}
   * @readonly
   */
  get move() {
    return this._move;
  }

  /**
   * Sets the total number of moves to zero on game reset.
   * @public
   * @param {Number} move
   */
  set move(value) {
    this._move = value;
  }

  /**
   * Sets the current start date on game reset.
   * @public
   * @param {Number} gameId
   */
  set gameId(value) {
    this._gameId = value;
  }

  async #firstUpdate() {
    try {
      const key = Date.now();
      const record = {
        id: key,
        gameId: this._gameId,
        move: this._move,
        boardState: structuredClone(LoggerReader.initialDomBoardState),
        lastMove: null,
      };
      const request = structuredClone(workerMessageScheme);
      request.request.type = "put";
      request.request.parameter.push(LOGGER_DB_ITEMS.OBJECT_STORE);
      request.request.parameter.push(record);
      const workerResponse = await dispatchWorker(
        LoggerWriter.dbWorker,
        request
      );
      handleResponse(workerResponse);
      LoggerReader.instances.get(this._gameId).addPrimaryKey(key);
    } catch (error) {
      console.log("error logger #firstUpdate" + error);
      throw new Error(
        "error caught in logger #firstUpdate: " +
          JSON.stringify(structuredClone(error))
      );
    }
  }

  /**
   * Logs the current boardstate and the last applied move to the database.
   * @public
   * @param {Move} - the last applied move.
   * @returns {void}
   * @readonly
   */
  async update(lastMove) {
    try {
      if (this._move === 0) {
        const allIndexKeys = await cacheAllIndexKeys();
        if (allIndexKeys.length > 9) {
          for (let i = 0, len = allIndexKeys.length - 9; i < len; i++) {
            const reader = LoggerReader.instances.get(allIndexKeys[i]);
            LoggerReader.dispose(reader);
            let allPrimaryKeys = await cacheKeysFromIndex(allIndexKeys[i]);
            for (const key of allPrimaryKeys) {
              const request = structuredClone(workerMessageScheme);
              request.request.type = "delete";
              request.request.parameter.push(LOGGER_DB_ITEMS.OBJECT_STORE);
              request.request.parameter.push(key);
              const workerResponse = await dispatchWorker(
                LoggerWriter.dbWorker,
                request
              );
              handleResponse(workerResponse);
            }
          }
        }
        const reader = new LoggerReader(this._gameId);
        await this.#firstUpdate();
      }
      this._move++;
      const key = Date.now();
      const record = {
        id: key,
        gameId: this._gameId,
        move: this._move,
        boardState: structuredClone(this._boardState.cloneInstance()),
        lastMove: structuredClone(lastMove.cloneInstance()),
      };
      const request = structuredClone(workerMessageScheme);
      request.request.type = "put";
      request.request.parameter.push(LOGGER_DB_ITEMS.OBJECT_STORE);
      request.request.parameter.push(record);
      const workerResponse = await dispatchWorker(
        LoggerWriter.dbWorker,
        request
      );
      handleResponse(workerResponse);
      const reader = LoggerReader.instances.get(this._gameId);
      reader.addPrimaryKey(key);
      reader.updateScrollItemElements();
    } catch (error) {
      console.log("error logger update: " + error);
      throw new Error(
        "error logger update: " + JSON.stringify(structuredClone(error))
      );
    }
  }
}

/**
 * ToDo...
 *
 * @class
 * @constructor
 */
class LoggerReader {
  /**
   * The start date for an index key value of the ReplayLog object store.
   * @private
   * @type {Number}
   */
  _gameId;

  /**
   * All cached primary keys for the index key of this instance.
   * @private
   * @type {Number[]}
   */
  _primaryKeys;

  /**
   * This AsyncGenerator function object acts as a pseudo db cursor state manager, because it
   * emulates the advance() methid of the IDBCursor interface.
   * The number of steps to advance is yielded and the
   * index of the primaryKeys array is updated, before the next
   * record from the object store is fetched.
   * @private
   * @type {AsyncGenerator}
   */
  _generator;

  /**
   * The winner of this logged game (if any).
   * This info will be displayed in the dialog modal.
   * @private
   * @type {String}
   */
  _winner;

  /**
   * The number of moves for this logged game.
   * This info will be displayed in the dialog modal.
   * @private
   * @type {Number}
   */
  _move;

  /**
   * The html scroll item container element inside the dialog
   * containing the instance properties for game replay selection.
   * @private
   * @type {HTMLDivElement}
   */
  _scrollItem;

  /**
   * @static
   * @type {Map<Number, LoggerReader>}
   */
  static instances = new Map();
  static historyBoard = null;
  static initialDomBoardState;
  static currentSelectedInstance = null;
  static playerHistoryUser = null;
  static playerHistoryBot = null;
  static scrollItemTemplate = null;
  static scrollContainer = null;

  static dispose(gameId) {
    try {
      if (LoggerReader.instances.has(gameId)) {
        const reader = LoggerReader.instances.get(gameId);
        if (reader.generator) {
          reader.generator.return();
          reader.generator = null;
        }
        reader._scrollItem.remove();
        reader._scrollItem = null;
        reader = null;
        LoggerReader.instances.delete(gameId);
      }
    } catch (error) {
      console.log("error logger reader dispose: " + error);
      throw new Error(error.toString());
    }
  }

  /**
   * Creates a new LoggerReader instance.
   * @constructor
   * @param {Number} gameId - The gameId index key value of the ReplayLog object store.
   */
  constructor(gameId) {
    try {
      if (
        !LoggerWriter.dbWorker ||
        !(LoggerWriter.dbWorker instanceof Worker)
      ) {
        throw new Error(
          "LoggerReader: invalid web worker instance for db requests"
        );
      }
      this._gameId = gameId;
      this._primaryKeys = [];
      this._generator = this.generatorFactory();
      this._winner = "none";
      this._move = 0;
      const fragment = LoggerReader.scrollItemTemplate.content.cloneNode(true);
      LoggerReader.scrollContainer.appendChild(fragment);
      this._scrollItem = Array.from(LoggerReader.scrollContainer.children).at(
        -1
      );
      this.updateScrollItemElements();
      LoggerReader.instances.set(this._gameId, this);
    } catch (error) {
      console.error(error.message);
    }
  }

  /**
   * Gets the gameId index key value.
   * @public
   * @type {Number}
   * @returns {Number}
   * @readonly
   */
  get gameId() {
    return this._gameId;
  }

  /**
   * Gets the array containing all primary keys.
   * @public
   * @type {Number[]}
   * @returns {Number[]}
   * @readonly
   */
  get primaryKeys() {
    return this._primaryKeys;
  }

  /**
   * Gets the async generator function object.
   * @public
   * @type {AsyncGenerator}
   * @returns {AsyncGenerator}
   * @readonly
   */
  get generator() {
    return this._generator;
  }

  /**
   * Sets the async generator function object.
   * @public
   * @param {AsyncGenerator | null} value
   */
  set generator(value) {
    this._generator = value;
  }

  /**
   * Gets the winner for this logged game history.
   * @public
   * @type {String}
   * @returns {String}
   * @readonly
   */
  get winner() {
    return this._winner;
  }

  /**
   * Sets the winner for this logged game history.
   * @public
   * @param {String} value
   */
  set winner(value) {
    this._winner = value;
  }

  /**
   * Gets the number of played moves for this logged game history.
   * @public
   * @type {Number}
   * @returns {Number}
   * @readonly
   */
  get move() {
    return this._move;
  }

  /**
   * Sets the number of played moves for this logged game history.
   * @public
   * @param {Number} value
   */
  set move(value) {
    this._move = value;
  }

  /**
   * Gets the html scroll item container element inside the dialog.
   * @public
   * @type {HTMLDivElement}
   * @returns {HTMLDivElement}
   * @readonly
   */
  get scrollItem() {
    return this._scrollItem;
  }

  updateScrollItemElements() {
    this._scrollItem.setAttribute("data-db-key", String(this._gameId));
    this._scrollItem.querySelector(".headerCaption").innerText =
      "view and replay this game";
    this._scrollItem.querySelector(".gameStarted").innerText =
      "started: " + this._gameId.toString();
    this._scrollItem.querySelector(".totalMoves").innerText =
      "total moves: " + String(this._move);
    this._scrollItem.querySelector(".winnerIs").innerText =
      "winner: " + this._winner;
    this._scrollItem.querySelector(".selectGameId").innerHTML = "select";
  }

  addPrimaryKey(key) {
    this._primaryKeys.push(key);
  }

  async *generatorFactory() {
    try {
      if (this.primaryKeys.length === 0) {
        return;
      }
      let cursorIndex = this.primaryKeys.length - 1;
      let request = null;
      let workerResponse = null;
      let record = null;
      let key = 0;
      request = structuredClone(workerMessageScheme);
      request.request.type = "get";
      key = this.primaryKeys[cursorIndex];
      request.request.parameter.push(LOGGER_DB_ITEMS.OBJECT_STORE);
      request.request.parameter.push(key);
      workerResponse = await dispatchWorker(LoggerWriter.dbWorker, request);
      handleResponse(workerResponse);
      record = structuredClone(workerResponse.response.message);
      yield record;
      while (true) {
        const advanceSteps = yield;
        switch (advanceSteps) {
          case Infinity:
            cursorIndex = this.primaryKeys.length - 1;
            break;
          case -Infinity:
            cursorIndex = 0;
            break;
          default:
            cursorIndex += advanceSteps;
        }
        if (this.primaryKeys.length === 0) {
          return;
        }
        if (cursorIndex < 0) {
          cursorIndex = 0;
        }
        if (cursorIndex > this.primaryKeys.length - 1) {
          cursorIndex = this.primaryKeys.length - 1;
        }
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        key = this.primaryKeys[cursorIndex];
        request.request.parameter.push(LOGGER_DB_ITEMS.OBJECT_STORE);
        request.request.parameter.push(key);
        workerResponse = await dispatchWorker(LoggerWriter.dbWorker, request);
        handleResponse(workerResponse);
        record = structuredClone(workerResponse.response.message);
        yield record;
      }
    } catch (error) {
      console.log("Error in cursor generator: " + error);
      return;
    }
  }

  async fetchRecord(advanceSteps) {
    try {
      const result = await this._generator.next(advanceSteps);
      if (result.done === true) {
        throw new Error(
          "error 1 in fetchRecord: Unconditional return in AsyncGenerator object"
        );
      }
      await this._generator.next();
      if (result.done === true) {
        throw new Error(
          "error 2 in fetchRecord: Unconditional return in AsyncGenerator object"
        );
      }
      return result.value;
    } catch (error) {
      throw new Error("error caught in fetchRecord: " + error.toString());
    }
  }
}

export {
  LOGGER_DB_ITEMS,
  LoggerWriter,
  LoggerReader,
  cacheAllIndexKeys,
  cacheKeysFromIndex,
};
