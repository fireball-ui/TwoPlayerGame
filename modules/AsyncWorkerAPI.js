/**
 * @module AsnycWorkerAPI
 * @description This module provides an Async/Await Wrapper API for the event-based
 * messaging between the main thread and a Web Worker instance.
 * @exports dispatchWorker
 */

const workerMessageScheme = Object.freeze({
  request: { type: "", parameter: [] },
  response: { error: false, message: null },
});

async function dispatchWorker(worker, message) {
  return new Promise((resolve, reject) => {
    const messageEventHandler = function (event) {
      worker.removeEventListener(event.type, messageEventHandler);
      resolve(event.data);
    };
    const errorEventHandler = function (event) {
      worker.removeEventListener(event.type, errorEventHandler);
      reject(new Error("Uncaught error for worker: " + event.data));
    };
    worker.addEventListener("message", messageEventHandler);
    worker.addEventListener("error", errorEventHandler);
    worker.postMessage(message);
  });
}

export { dispatchWorker, workerMessageScheme };
