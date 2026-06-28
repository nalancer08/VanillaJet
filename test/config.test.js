const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const Server = require('../framework/server.js');
const { waitForListening, closeServer } = require('./helpers.js');

// Guards the profile-resolution regression: 1.3.x consumers key settings by the
// active profile name (settings[options.profile]); the newer shape uses a single
// nested 'profile'. Both must resolve to obj.options.
const servers = [];

async function boot(options) {
  const server = new Server(options, []);
  servers.push(server);
  await waitForListening(server);
  return server;
}

after(async () => {
  for (const server of servers) {
    await closeServer(server);
  }
});

test('legacy config shape: settings keyed by active profile name', async () => {
  const server = await boot({
    profile: 'qa',
    settings: {
      qa: { port: 0, marker: 'legacy' },
      development: { port: 0, marker: 'dev' },
      shared: {},
      security: {}
    }
  });
  assert.equal(server.options.marker, 'legacy');
});

test('nested config shape: single profile object', async () => {
  const server = await boot({
    settings: {
      profile: { port: 0, marker: 'nested' },
      shared: {},
      security: {}
    }
  });
  assert.equal(server.options.marker, 'nested');
});
