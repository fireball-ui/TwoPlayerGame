/**
 * @module ConfigState
 * @description This module provides classes that perform read and update operations to the database,
 * whenever the changed configurations are saved or restored to factory default.
 * @requires module:AsyncAPIWrapper
 * @exports Settings - Reflects the current configuration state form the settings panel.
 */

import {
  dispatchWorker,
  workerMessageScheme,
  handleResponse,
} from "./AsyncAPIWrapper.js";

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
    if (!value.id || !value.settings || value.id !== "WinningRules") {
      throw new Error("Class Settings: Invalid value for setter: " + value);
    }
    for (const [key, val] of Object.entries(value.settings)) {
      if (isNaN(val)) {
        throw new Error("Class Settings: Invalid value for setter: " + val);
      }
      this._winningRules.settings[key] = val;
    }
  }

  /**
   * Sets the object containing the search tree depth and search timeout values
   * @public
   * @type {Object}
   * @param {Object}
   */
  set searchRules(value) {
    if (!value.id || !value.settings || value.id !== "SearchRules") {
      throw new Error("Class Settings: Invalid value for setter: " + value);
    }
    const values = Object.values(value.settings);
    const keys = Object.keys(value.settings);
    values.forEach((val, index) => {
      if (isNaN(val)) {
        throw new Error("Class Settings: Invalid value for setter: " + val);
      }
      this._searchRules.settings[keys[index]] = val;
    });
  }

  /**
   * Sets the score weight for material adavntage (total difference of conquered towers)
   * @public
   * @type {Object}
   * @param {Object}
   */
  set materialAdvantageConquered(value) {
    if (
      !value.id ||
      !value.settings ||
      value.id !== "MaterialAdvantageConquered"
    ) {
      throw new Error("Class Settings: Invalid value for setter: " + value);
    }
    const values = Object.values(value.settings);
    const keys = Object.keys(value.settings);
    values.forEach((val, index) => {
      if (isNaN(val)) {
        throw new Error("Class Settings: Invalid value for setter: " + val);
      }
      this._materialAdvantageConquered.settings[keys[index]] = val;
    });
  }

  /**
   * Sets the score weights for the safety zone proximity of towers in reverse vertical movement.
   * @public
   * @type {Object}
   * @param {Object}
   */
  set safetyZoneProximity(value) {
    if (!value.id || !value.settings || value.id !== "SafetyZoneProximity") {
      throw new Error("Class Settings: Invalid value for setter: " + value);
    }
    const values = Object.values(value.settings);
    const keys = Object.keys(value.settings);
    values.forEach((val, index) => {
      if (isNaN(val)) {
        throw new Error("Class Settings: Invalid value for setter: " + val);
      }
      this._safetyZoneProximity.settings[keys[index]] = val;
    });
  }

  /**
   * Sets the score weight for material adavntage (total difference of accounted opponent stones in the vault)
   * @public
   * @type {Object}
   * @param {Object}
   */
  set materialAdvantageAccounted(value) {
    if (
      !value.id ||
      !value.settings ||
      value.id !== "MaterialAdvantageAccounted"
    ) {
      throw new Error("Class Settings: Invalid value for setter: " + value);
    }
    const values = Object.values(value.settings);
    const keys = Object.keys(value.settings);
    values.forEach((val, index) => {
      if (isNaN(val)) {
        throw new Error("Class Settings: Invalid value for setter: " + val);
      }
      this._materialAdvantageAccounted.settings[keys[index]] = val;
    });
  }

  /**
   * Returns a new deep copied instance without the worker property,
   * compliant with the structured clone algorithm.
   * @returns {Object} - the new deep copied instance without the worker property
   */
  cloneInstance() {
    const deepCopy = new Object();
    deepCopy.winningRules = structuredClone(this.winningRules);
    deepCopy.searchRules = structuredClone(this.searchRules);
    deepCopy.materialAdvantageConquered = structuredClone(
      this.materialAdvantageConquered
    );
    deepCopy.safetyZoneProximity = structuredClone(this.safetyZoneProximity);
    deepCopy.materialAdvantageAccounted = structuredClone(
      this.materialAdvantageAccounted
    );
    return deepCopy;
  }

  /**
   * Load the initial configuration from database
   * @returns {void}
   */
  async load() {
    return new Promise(async (resolve, reject) => {
      try {
        let request = null;
        let workerResponse = null;
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.winningRules.id);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        this.winningRules = structuredClone(workerResponse.response.message);
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.searchRules.id);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        this.searchRules = structuredClone(workerResponse.response.message);
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.materialAdvantageConquered.id);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        this.materialAdvantageConquered = structuredClone(
          workerResponse.response.message
        );
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.safetyZoneProximity.id);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        this.safetyZoneProximity = structuredClone(
          workerResponse.response.message
        );
        request = structuredClone(workerMessageScheme);
        request.request.type = "get";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.materialAdvantageAccounted.id);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        this.materialAdvantageAccounted = structuredClone(
          workerResponse.response.message
        );
        resolve();
      } catch (error) {
        reject(error.toString());
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
        let workerResponse = null;
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(Settings.factoryWinningRules);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(Settings.factorySearchRules);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(
          Settings.factoryMaterialAdvantageConquered
        );
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(Settings.factorySafetyZoneProximity);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(
          Settings.factoryMaterialAdvantageAccounted
        );
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
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
        reject(error.toString());
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
        let workerResponse = null;
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.winningRules);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.searchRules);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.materialAdvantageConquered);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.safetyZoneProximity);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        request = structuredClone(workerMessageScheme);
        request.request.type = "put";
        request.request.parameter.push(Settings.objStoreName);
        request.request.parameter.push(this.materialAdvantageAccounted);
        workerResponse = await dispatchWorker(this._dbWorker, request);
        handleResponse(workerResponse);
        resolve();
      } catch (error) {
        console.log("error save settings: " + error);
        reject(error.toString());
      }
    });
  }
}

export { Settings };
