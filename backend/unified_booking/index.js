let modulePromise;

exports.handler = async (...args) => {
  if (!modulePromise) {
    modulePromise = import("./index.mjs");
  }
  const mod = await modulePromise;
  if (typeof mod.handler !== "function") {
    throw new Error("index.mjs does not export handler");
  }
  return mod.handler(...args);
};
