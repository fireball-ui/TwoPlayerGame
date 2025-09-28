/**
 * @module DbWorker
 * @description This module is executed in a Web Worker context. It handles
 * all IndexedDB API transactions, including game state logs for replay and settings adjustments.
 * @requires module:ConfigState
 * @requires module:Logger
 */

import { Settings } from "./ConfigState.js";
import { workerMessageScheme } from "./AsyncAPIWrapper.js";
import { LOGGER_DB_ITEMS } from "./Logger.js";

const idbFactory = self.indexedDB ?? null;
let db = null;
const dbVersion = 24;
let initFromScratch = false;

async function getKeysFromIndexOnly(objStoreName, indexName, indexKey) {
  return new Promise((resolve, reject) => {
    try {
      const keyRange = IDBKeyRange.only(indexKey);
      let allPrimaryKeys;
      const xact = db.transaction(objStoreName, "readonly");
      const objStore = xact.objectStore(objStoreName);
      const index = objStore.index(indexName);
      const request = index.getAllKeys(keyRange);
      request.addEventListener("error", (event) => {
        reject(new Error(event.target.error));
      });
      request.addEventListener("success", (event) => {
        allPrimaryKeys = event.target.result;
      });
      xact.addEventListener("complete", () => {
        resolve(allPrimaryKeys);
      });
      xact.addEventListener("error", (event) => {
        reject(new Error(event.target.error));
      });
      xact.addEventListener("abort", (event) => {
        reject(new Error(event.target.error));
      });
      xact.commit();
    } catch (error) {
      reject(new Error("Error in xact: " + error.toString()));
    }
  });
}

async function getAllIndexKeys(objStoreName, indexName) {
  return new Promise((resolve, reject) => {
    try {
      let allIndexKeys = [];
      const xact = db.transaction(objStoreName, "readonly");
      const objStore = xact.objectStore(objStoreName);
      const index = objStore.index(indexName);
      const request = index.openKeyCursor(
        IDBKeyRange.lowerBound(0),
        "nextunique"
      );
      request.addEventListener("error", (event) => {
        reject(new Error(event.target.error));
      });
      request.addEventListener("success", (event) => {
        xact.addEventListener("complete", () => {
          resolve(allIndexKeys);
        });
        xact.addEventListener("error", (event) => {
          reject(new Error(event.target.error));
        });
        xact.addEventListener("abort", (event) => {
          reject(new Error(event.target.error));
        });
        const cursor = event.target.result;
        if (cursor) {
          allIndexKeys.push(cursor.key);
          cursor.continue();
        } else {
          xact.commit();
        }
      });
    } catch (error) {
      reject(new Error("Error in xact: " + error.toString()));
    }
  });
}

async function storeXact(objStoreName, method, parm = null) {
  return new Promise((resolve, reject) => {
    try {
      let requestResult = "";
      const xact = db.transaction(objStoreName, "readwrite");
      const objStore = xact.objectStore(objStoreName);
      let request = null;
      switch (method) {
        case "put":
          request = objStore.put(parm);
          break;
        case "get":
          request = objStore.get(parm);
          break;
        case "clear":
          request = objStore.clear();
          break;
        case "delete":
          request = objStore.delete(parm);
          break;
        default:
          throw new Error("Invalid method: " + method);
      }
      request.addEventListener("success", (event) => {
        requestResult = event.target.result;
      });
      request.addEventListener("error", (event) => {
        reject(new Error(event.target.error));
      });
      xact.addEventListener("complete", () => {
        resolve(requestResult);
      });
      xact.addEventListener("error", (event) => {
        reject(new Error(event.target.error));
      });
      xact.addEventListener("abort", (event) => {
        reject(new Error(event.target.error));
      });
      xact.commit();
    } catch (error) {
      reject(new Error("Error in xact: " + error.toString()));
    }
  });
}

async function openDb() {
  return new Promise((resolve, reject) => {
    try {
      const dbRequest = idbFactory.open("TowerHunt", dbVersion);
      dbRequest.addEventListener("upgradeneeded", (event) => {
        initFromScratch = true;
        const db = event.target.result;
        Array.from(db.objectStoreNames).forEach((name, _) => {
          db.deleteObjectStore(name);
        });
        const objStoreLogger = db.createObjectStore(
          LOGGER_DB_ITEMS.OBJECT_STORE,
          {
            keyPath: LOGGER_DB_ITEMS.KEY_PATH,
          }
        );
        objStoreLogger.createIndex(
          LOGGER_DB_ITEMS.INDEX_NAME,
          LOGGER_DB_ITEMS.INDEX_NAME,
          { unique: false }
        );
        db.createObjectStore(Settings.objStoreName, {
          keyPath: Settings.keyPathName,
        });
      });
      dbRequest.addEventListener("success", (event) => {
        resolve(event.target.result);
      });
      dbRequest.addEventListener("error", (event) => {
        throw new Error("Error opening IndexedDB:", event.target.error);
      });
      dbRequest.addEventListener("blocked", (event) => {
        throw new Error("Error opening IndexedDB:", event.target.error);
      });
    } catch (error) {
      reject(new Error("Error opening database: " + error.message));
    }
  });
}

async function open() {
  try {
    if (idbFactory === null) {
      throw new Error(
        "IndexedDB is not supported in this browser. Please use a modern browser."
      );
    }
    if (db === null) {
      db = await openDb();
    }
    if (initFromScratch === true) {
      await storeXact(LOGGER_DB_ITEMS.OBJECT_STORE, "clear");
      await storeXact(Settings.objStoreName, "clear");
      await storeXact(
        Settings.objStoreName,
        "put",
        Settings.factoryWinningRules
      );
      await storeXact(
        Settings.objStoreName,
        "put",
        Settings.factorySearchRules
      );
      await storeXact(
        Settings.objStoreName,
        "put",
        Settings.factoryMaterialAdvantageConquered
      );
      await storeXact(
        Settings.objStoreName,
        "put",
        Settings.factorySafetyZoneProximity
      );
      await storeXact(
        Settings.objStoreName,
        "put",
        Settings.factoryMaterialAdvantageAccounted
      );
      initFromScratch = false;
    }
  } catch (error) {
    throw new Error("Error in open db: " + error);
  }
}

self.addEventListener("message", async (event) => {
  try {
    const response = structuredClone(event.data);
    switch (event.data.request.type) {
      case "open":
        await open();
        response.response.error = false;
        response.response.message = null;
        self.postMessage(response);
        break;
      case "get":
        const recordGet = await storeXact(
          event.data.request.parameter[0],
          "get",
          event.data.request.parameter[1]
        );
        response.response.error = false;
        response.response.message = recordGet;
        self.postMessage(response);
        break;
      case "put":
        const key = await storeXact(
          event.data.request.parameter[0],
          "put",
          event.data.request.parameter[1]
        );
        response.response.error = false;
        response.response.message = key;
        self.postMessage(response);
        break;
      case "delete":
        await storeXact(
          event.data.request.parameter[0],
          "delete",
          event.data.request.parameter[1]
        );
        response.response.error = false;
        response.response.message =
          "record for primary key deleted: " +
          String(event.data.request.parameter[1]);
        self.postMessage(response);
        break;
      case "getAllIndexKeys":
        const allIndexKeys = await getAllIndexKeys(
          event.data.request.parameter[0],
          event.data.request.parameter[1]
        );
        response.response.error = false;
        response.response.message = allIndexKeys;
        self.postMessage(response);
        break;
      case "getKeysFromIndexOnly":
        const allPrimaryKeys = await getKeysFromIndexOnly(
          event.data.request.parameter[0],
          event.data.request.parameter[1],
          event.data.request.parameter[2]
        );
        response.response.error = false;
        response.response.message = allPrimaryKeys;
        self.postMessage(response);
        break;
      default:
        throw new Error("invalid request type for db worker");
    }
  } catch (error) {
    console.log(error);
    const response = structuredClone(workerMessageScheme);
    response.response.error = true;
    response.response.message = error;
    self.postMessage(response);
  }
});

self.addEventListener("error", (event) => {
  console.log(error.toString());
});
