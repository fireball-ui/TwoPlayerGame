/**
 * @module Logger
 * @description ToDo...
 * @requires module:AsyncAPIWrapper
 * @exports Logger - ToDo...
 */

import {
  dispatchWorker,
  workerMessageScheme,
  handleResponse,
} from "./AsyncAPIWrapper.js";

/**
 * ToDo...
 *
 * @class
 * @constructor
 */
class ReplayLogger {
  /**
   * The Web Worker instance for handling IndexedDB database operations.
   * @private
   * @type {Worker}
   * @readonly
   */
  _dbWorker;

  /**
   * The current board state.
   * @private
   * @type {BoardState}
   * @readonly
   */
  _boardState;

  /**
   * The start date for this game.
   * This property maps the startDate index of the ReplayLog object store.
   * @private
   * @type {Date}
   */
  _startDate;

  /**
   * The number of moves currently applied to the game.
   * This property maps the move index of the ReplayLog object store.
   * @private
   * @type {Number}
   */
  _move;

  /**
   * @static
   * @type {String}
   */
  static objStoreName = "ReplayLog";

  /**
   * @static
   * @type {String}
   */
  static indexName = "startDate";

  /**
   * @static
   * @type {String}
   */
  static keyPathName = "id";

  /**
   * Creates a new Move instance.
   * @constructor
   * @param {BoardState} boardState - The current board state.
   */
  constructor(boardState, dbWorker) {
    this._dbWorker = dbWorker;
    this._boardState = boardState;
    this._startDate = new Date();
    this._move = 0;
  }

  /**
   * Gets the current web worker instance for db requests.
   * @public
   * @type {Worker}
   * @returns {Worker}
   * @readonly
   */
  get boardState() {
    return this._dbWorker;
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
  get startDate() {
    return this._startDate;
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
   * @param {Date} startDate
   */
  set startDate(value) {
    this._startDate = value;
  }

  async #getKeysFromIndexOnly(indexKey) {
    return new Promise(async (resolve, reject) => {
      try {
        const request = structuredClone(workerMessageScheme);
        request.request.type = "getKeysFromIndexOnly";
        request.request.parameter.push(ReplayLogger.objStoreName);
        request.request.parameter.push(ReplayLogger.indexName);
        request.request.parameter.push(indexKey);
        const workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        resolve(workerResponse.response.message);
      } catch (error) {
        console.log("error logger getAllIndexKeys: " + error);
        reject(error.toString());
      }
    });
  }

  async #getAllIndexKeys() {
    return new Promise(async (resolve, reject) => {
      try {
        const request = structuredClone(workerMessageScheme);
        request.request.type = "getAllIndexKeys";
        request.request.parameter.push(ReplayLogger.objStoreName);
        request.request.parameter.push(ReplayLogger.indexName);
        const workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        resolve(workerResponse.response.message);
      } catch (error) {
        console.log("error logger getAllIndexKeys: " + error);
        reject(error.toString());
      }
    });
  }

  async #firstUpdate() {
    return new Promise(async (resolve, reject) => {
      try {
        const key = String(Number(this._startDate)) + "#" + String(this._move);
        const record = {
          id: key,
          startDate: String(Number(this._startDate)),
          move: this._move,
          boardState: structuredClone(this._boardState.cloneInstance()),
          lastMove: null,
        };
        const request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(ReplayLogger.objStoreName);
        request.request.parameter.push(record);
        const workerResponse = await dispatchWorker(this._dbWorker, request);
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
          const allIndexKeys = await this.#getAllIndexKeys();
          if (allIndexKeys.length > 9) {
            for (let i = 0, len = allIndexKeys.length - 9; i < len; i++) {
              let allPrimaryKeys = await this.#getKeysFromIndexOnly(
                allIndexKeys[i]
              );
              allPrimaryKeys.forEach(async (key) => {
                const request = structuredClone(workerMessageScheme);
                request.request.type = "delete";
                request.request.parameter.push(ReplayLogger.objStoreName);
                request.request.parameter.push(key);
                const workerResponse = await dispatchWorker(
                  this._dbWorker,
                  request
                );
                handleResponse(workerResponse);
              });
            }
          }
          await this.#firstUpdate();
        }
        this._move++;
        const key = String(Number(this._startDate)) + "#" + String(this._move);
        const record = {
          id: key,
          startDate: String(Number(this._startDate)),
          move: this._move,
          boardState: structuredClone(this._boardState.cloneInstance()),
          lastMove: structuredClone(lastMove.cloneInstance()),
        };
        const request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(ReplayLogger.objStoreName);
        request.request.parameter.push(record);
        const workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        resolve();
      } catch (error) {
        console.log("error logger update: " + error);
        reject(error.toString());
      }
    });
  }
}

export { ReplayLogger };
