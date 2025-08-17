/**
 * @module DbWorker
 * @description This module is executed in a Web Worker context. It handles
 * all IndexedDB API transactions, including game state logs for replay and settings adjustments.
 * @requires module:ConfigState
 * @requires module:Logger
 */

import { Settings } from "./ConfigState.js";
import { workerMessageScheme } from "./AsyncWorkerAPI.js";
import { ReplayLogger } from "./Logger.js";

const idbFactory = self.indexedDB ?? null;
let db = null;
const dbVersion = 3;
let initFromScratch = false;

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
        default:
          throw new Error("Invalid method: " + method);
      }
      request.addEventListener("success", (event) => {
        //resolve(event.target.result);
        requestResult = event.target.result;
      });
      request.addEventListener("error", (event) => {
        reject(new Error(event.target.error));
        console.log("error in operation: " + event.target.error);
      });
      xact.addEventListener("complete", () => {
        resolve(requestResult);
      });
      xact.addEventListener("error", (event) => {
        reject(new Error(event.target.error));
        console.log("error in xact: " + event.target.error);
      });
      xact.addEventListener("abort", (event) => {
        reject(new Error(event.target.error));
        console.log("error in xact: " + event.target.error);
      });
      xact.commit();
    } catch (error) {
      console.log(error);
      reject(new Error("Error in xact: " + error));
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
        db.createObjectStore(ReplayLogger.objStoreName, {
          keyPath: "id",
        });
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
      console.log(error);
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
      await storeXact(ReplayLogger.objStoreName, "clear");
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
        Settings.factoryMaterialAdvantageAccounted
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
    console.log(error);
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
        const record = await storeXact(
          event.data.request.parameter[0],
          "get",
          event.data.request.parameter[1]
        );
        response.response.error = false;
        response.response.message = record;
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
