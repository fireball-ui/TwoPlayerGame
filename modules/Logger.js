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

async function disposeAllDbCursors(indexValue) {
  return new Promise(async (resolve, reject) => {
    try {
      const request = structuredClone(workerMessageScheme);
      request.request.type = "disposeAllDbCursors";
      request.request.parameter.push(indexValue);
      const workerResponse = await dispatchWorker(
        LoggerWriter.dbWorker,
        request
      );
      handleResponse(workerResponse);
      resolve(workerResponse.response.message);
    } catch (error) {
      console.log("error logger disposeCursor: " + error);
      reject(error.toString());
    }
  });
}

async function getAllIndexKeys() {
  return new Promise(async (resolve, reject) => {
    try {
      const request = structuredClone(workerMessageScheme);
      request.request.type = "getAllIndexKeys";
      request.request.parameter.push(LOGGER_DB_ITEMS.OBJECT_STORE);
      request.request.parameter.push(LOGGER_DB_ITEMS.INDEX_NAME);
      const workerResponse = await dispatchWorker(
        LoggerWriter.dbWorker,
        request
      );
      handleResponse(workerResponse);
      resolve(workerResponse.response.message);
    } catch (error) {
      console.log("error logger getAllIndexKeys: " + error);
      reject(error.toString());
    }
  });
}

async function getKeysFromIndexOnly(indexKey) {
  return new Promise(async (resolve, reject) => {
    try {
      const request = structuredClone(workerMessageScheme);
      request.request.type = "getKeysFromIndexOnly";
      request.request.parameter.push(LOGGER_DB_ITEMS.OBJECT_STORE);
      request.request.parameter.push(LOGGER_DB_ITEMS.INDEX_NAME);
      request.request.parameter.push(indexKey);
      const workerResponse = await dispatchWorker(
        LoggerWriter.dbWorker,
        request
      );
      handleResponse(workerResponse);
      resolve(workerResponse.response.message);
    } catch (error) {
      console.log("error logger getAllIndexKeys: " + error);
      reject(error.toString());
    }
  });
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
    return new Promise(async (resolve, reject) => {
      try {
        const key = Date.now();
        const record = {
          id: key,
          gameId: this._gameId,
          move: this._move,
          boardState: structuredClone(this._boardState.cloneInstance()),
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
        resolve();
      } catch (error) {
        console.log("error logger #firstUpdate" + error);
        reject(error.toString());
      }
    });
  }

  /**
   * Logs the current boardstate and the last applied move to the database.
   * @public
   * @param {Move} - the last applied move.
   * @returns {void}
   * @readonly
   */
  async update(lastMove) {
    return new Promise(async (resolve, reject) => {
      try {
        if (this._move === 0) {
          const allIndexKeys = await getAllIndexKeys();
          if (allIndexKeys.length > 9) {
            for (let i = 0, len = allIndexKeys.length - 9; i < len; i++) {
              const reader = LoggerReader.instances.get(allIndexKeys[i]);
              await LoggerReader.dispose(reader);
              let allPrimaryKeys = await getKeysFromIndexOnly(allIndexKeys[i]);
              allPrimaryKeys.forEach(async (key) => {
                const request = structuredClone(workerMessageScheme);
                request.request.type = "delete";
                request.request.parameter.push(LOGGER_DB_ITEMS.OBJECT_STORE);
                request.request.parameter.push(key);
                const workerResponse = await dispatchWorker(
                  LoggerWriter.dbWorker,
                  request
                );
                handleResponse(workerResponse);
              });
            }
          }
          await this.#firstUpdate();
          const reader = new LoggerReader(this._gameId);
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
        resolve();
      } catch (error) {
        console.log("error logger update: " + error);
        reject(error.toString());
      }
    });
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
   * @static
   * @type {Map<Number, LoggerReader>}
   */
  static instances = new Map();

  static async dispose(gameId) {
    try {
      if (LoggerReader.instances.has(gameId)) {
        await disposeAllDbCursors(gameId);
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
    if (!LoggerWriter.dbWorker || !(LoggerWriter.dbWorker instanceof Worker)) {
      throw new Error(
        "LoggerReader: invalid web worker instance for db requests"
      );
    }
    this._gameId = gameId;
    LoggerReader.instances.set(this._gameId, this);
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

  async createPseudoDbCursor() {
    return new Promise(async (resolve, reject) => {
      try {
        const request = structuredClone(workerMessageScheme);
        request.request.type = "createPseudoDbCursor";
        request.request.parameter.push(this._gameId);
        const workerResponse = await dispatchWorker(
          LoggerWriter.dbWorker,
          request
        );
        handleResponse(workerResponse);
        resolve();
      } catch (error) {
        console.log("error logger createDbCursor: " + error);
        reject(error.toString());
      }
    });
  }

  async fetchRecord(steps = -1) {
    return new Promise(async (resolve, reject) => {
      try {
        const request = structuredClone(workerMessageScheme);
        request.request.type = "fetchRecordFromPseudoDbCursor";
        request.request.parameter.push(this._gameId);
        request.request.parameter.push(steps);
        const workerResponse = await dispatchWorker(
          LoggerWriter.dbWorker,
          request
        );
        handleResponse(workerResponse);
        resolve(structuredClone(workerResponse.response.message));
      } catch (error) {
        console.log("error logger fetchRecord: " + error);
        reject(error.toString());
      }
    });
  }
}

export { LOGGER_DB_ITEMS, LoggerWriter, LoggerReader };
