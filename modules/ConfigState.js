/**
 * @module ConfigState
 * @description This module provides classes that perform read and update operations to the database,
 * whenever the changed configurations are saved or restored to factory default by the user.
 * @requires module:AsyncWorkerAPI
 * @exports Settings - Reflects the current configuration state form the settings panel.
 */

import { dispatchWorker, workerMessageScheme } from "./AsyncWorkerAPI.js";

/**
 * Reflects the current configuration state form the settings panel.
 *
 * @class
 * @property {Object} customized - The current settings during the game.
 * @constructor
 * @param {Worker} dbWorker - The Web Worker instance handling IndexedDB database operations
 * @throws {Error}
 */
class Settings {
  /**
   * @private
   * @type {Worker}
   */
  _dbWorker;

  /**
   * @private
   * @type {Object}
   */
  _winningRules;

  /**
   * @private
   * @type {Object}
   */
  _searchRules;

  /**
   * @private
   * @type {Object}
   */
  _materialAdvantageConquered;

  /**
   * @private
   * @type {Object}
   */
  _safetyZoneProximity;

  /**
   * @private
   * @type {Object}
   */
  _materialAdvantageAccounted;

  /**
   * @static
   * @type {Object}
   */
  static factoryWinningRules = Object.freeze({
    id: "WinningRules",
    settings: { safetyZone: 1, materialOpponent: 6 },
  });

  /**
   * @static
   * @type {Object}
   */
  static factorySearchRules = Object.freeze({
    id: "SearchRules",
    settings: { depth: 4, timeout: 10 },
  });

  /**
   * @static
   * @type {Object}
   */
  static factoryMaterialAdvantageConquered = Object.freeze({
    id: "MaterialAdvantageConquered",
    settings: { totalWeight: 10 },
  });

  /**
   * @static
   * @type {Object}
   */
  static factorySafetyZoneProximity = Object.freeze({
    id: "SafetyZoneProximity",
    settings: {
      weightRowDistance1: 5,
      weightRowDistance2: 4,
      weightRowDistance3: 3,
      weightRowDistance4: 2,
      weightRowDistance5: 1,
      totalWeight: 10,
    },
  });

  /**
   * @static
   * @type {Object}
   */
  static factoryMaterialAdvantageAccounted = Object.freeze({
    id: "MaterialAdvantageAccounted",
    settings: { totalWeight: 20 },
  });

  /**
   * @static
   * @type {String}
   */
  static objStoreName = "Settings";

  /**
   * @static
   * @type {String}
   */
  static keyPathName = "id";

  /**
   * Creates a new Settings instance.
   * @constructor
   * @param {Worker} dbWorker - The Web Worker instance handling IndexedDB database operations
   * @throws {TypeError}
   */
  constructor(dbWorker) {
    this._dbWorker = dbWorker;
    this._winningRules = structuredClone(Settings.factoryWinningRules);
    this._searchRules = structuredClone(Settings.factorySearchRules);
    this._materialAdvantageConquered = structuredClone(
      Settings.factoryMaterialAdvantageConquered
    );
    this._safetyZoneProximity = structuredClone(
      Settings.factorySafetyZoneProximity
    );
    this._materialAdvantageAccounted = structuredClone(
      Settings.factoryMaterialAdvantageAccounted
    );
  }

  /**
   * Gets the Web Worker instance for IndexedDB operations
   * @public
   * @type {Worker}
   * @returns {Worker}
   * @readonly
   */
  get dbWorker() {
    return this._dbWorker;
  }

  /**
   * Gets the winning rules settings
   * @public
   * @type {Object}
   * @returns {Object}
   */
  get winningRules() {
    return this._winningRules;
  }

  /**
   * Gets the object containing the search tree depth and search timeout values
   * @public
   * @type {Object}
   * @returns {Object}
   */
  get searchRules() {
    return this._searchRules;
  }

  /**
   * Gets the score weight for material adavntage (total difference of conquered towers)
   * @public
   * @type {Object}
   * @returns {Object}
   */
  get materialAdvantageConquered() {
    return this._materialAdvantageConquered;
  }

  /**
   * Gets the score weights for the safety zone proximity of towers in reverse vertical movement.
   * @public
   * @type {Object}
   * @returns {Object}
   */
  get safetyZoneProximity() {
    return this._safetyZoneProximity;
  }

  /**
   * Gets the score weight for material adavntage (total difference of accounted opponent stones in the vault)
   * @public
   * @type {Object}
   * @returns {Object}
   */
  get materialAdvantageAccounted() {
    return this._materialAdvantageAccounted;
  }

  /**
   * Sets the winning rules settings
   * @public
   * @type {Object}
   * @param {Object}
   */
  set winningRules(value) {
    this._winningRules = value;
  }

  /**
   * Sets the object containing the search tree depth and search timeout values
   * @public
   * @type {Object}
   * @param {Object}
   */
  set searchRules(value) {
    this._searchRules = value;
  }

  /**
   * Sets the score weight for material adavntage (total difference of conquered towers)
   * @public
   * @type {Object}
   * @param {Object}
   */
  set materialAdvantageConquered(value) {
    this._materialAdvantageConquered = value;
  }

  /**
   * Sets the score weights for the safety zone proximity of towers in reverse vertical movement.
   * @public
   * @type {Object}
   * @param {Object}
   */
  set safetyZoneProximity(value) {
    this._safetyZoneProximity = value;
  }

  /**
   * Sets the score weight for material adavntage (total difference of accounted opponent stones in the vault)
   * @public
   * @type {Object}
   * @param {Object}
   */
  set materialAdvantageAccounted(value) {
    this._materialAdvantageAccounted = value;
  }

  /**
   * Load the initial configuration from database
   * @returns {void}
   */
  async load() {
    return new Promise(async (resolve, reject) => {
      try {
        let request = null;
        let workerMessagePromise = null;
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.winningRules.id);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        this.winningRules = structuredClone(
          workerMessagePromise.response.message
        );
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.searchRules.id);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        this.searchRules = structuredClone(
          workerMessagePromise.response.message
        );
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.materialAdvantageConquered.id);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        this.materialAdvantageConquered = structuredClone(
          workerMessagePromise.response.message
        );
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.safetyZoneProximity.id);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        this.safetyZoneProximity = structuredClone(
          workerMessagePromise.response.message
        );
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.materialAdvantageAccounted.id);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        this.materialAdvantageAccounted = structuredClone(
          workerMessagePromise.response.message
        );
        resolve();
      } catch (error) {
        console.log("error load settings: " + error);
        reject(error);
      }
    });
  }

  /**
   * Restore the Settings object store to the factory default in the database
   * and update all properties of this instance.
   * @returns {void}
   */
  async restoreFactoryDefault() {
    return new Promise(async (resolve, reject) => {
      try {
        let request = null;
        let workerMessagePromise = null;
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(Settings.factoryWinningRules);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(Settings.factorySearchRules);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(
          Settings.factoryMaterialAdvantageConquered
        );
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(Settings.factorySafetyZoneProximity);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(
          Settings.factoryMaterialAdvantageAccounted
        );
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        this.winningRules = structuredClone(Settings.factoryWinningRules);
        this.searchRules = structuredClone(Settings.factorySearchRules);
        this.materialAdvantageConquered = structuredClone(
          Settings.factoryMaterialAdvantageConquered
        );
        this.safetyZoneProximity = structuredClone(
          Settings.factorySafetyZoneProximity
        );
        this.materialAdvantageAccounted = structuredClone(
          Settings.factoryMaterialAdvantageAccounted
        );
        resolve();
      } catch (error) {
        console.log("error save settings: " + error);
        reject(error);
      }
    });
  }

  /**
   * Perists the customized properties in the database
   * @returns {void}
   */
  async save() {
    return new Promise(async (resolve, reject) => {
      try {
        let request = null;
        let workerMessagePromise = null;
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.winningRules);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.searchRules);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.materialAdvantageConquered);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.safetyZoneProximity);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.materialAdvantageAccounted);
        workerMessagePromise = await dispatchWorker(this._dbWorker, request);
        if (workerMessagePromise.response.error === true) {
          throw new Error(
            "Caught error loading records from db: " +
              workerMessagePromise.response.message
          );
        }
        resolve();
      } catch (error) {
        console.log("error save settings: " + error);
        reject(error);
      }
    });
  }
}

export { Settings };
