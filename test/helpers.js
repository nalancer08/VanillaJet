// Shared test utilities for the VanillaJet smoke harness.
// No external dependencies: only Node built-ins + the framework under test.

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Creates a throwaway workspace and writes the given files into it.
 * @param {Object<string,string|Buffer>} files map of relative path -> content
 * @returns {string} absolute path to the temp workspace
 */
function makeTempWorkspace(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanillajet-test-'));
  for (const [relativePath, content] of Object.entries(files || {})) {
    const fullPath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return dir;
}

/** Removes a temp workspace created by makeTempWorkspace. */
function removeWorkspace(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Builds the options object that `Server` expects. Use port 0 for an ephemeral port. */
function serverOptions(port, profile) {
  return {
    settings: {
      profile: Object.assign({ port: port, https_server: false }, profile || {}),
      shared: {},
      security: {}
    }
  };
}

/** Resolves once the server socket is actually listening. */
function waitForListening(server) {
  return new Promise((resolve) => {
    if (server.httpx && server.httpx.listening) {
      return resolve();
    }
    server.httpx.once('listening', resolve);
  });
}

/** Returns the ephemeral port the server bound to. */
function boundPort(server) {
  return server.httpx.address().port;
}

/** Closes the server socket. */
function closeServer(server) {
  return new Promise((resolve) => server.httpx.close(() => resolve()));
}

module.exports = {
  makeTempWorkspace,
  removeWorkspace,
  serverOptions,
  waitForListening,
  boundPort,
  closeServer
};
