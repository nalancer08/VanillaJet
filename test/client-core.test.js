const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const CORE = path.join(__dirname, '..', 'client', 'vanillaJet.js');

describe('packaged client core', () => {
  // The browser-side framework ships inside the package (single source of
  // truth for every consumer app); the build minifies it to
  // public/scripts/core/vanillaJet.min.js unless the app still carries a
  // legacy local copy.
  test('client/vanillaJet.js ships with the package', () => {
    assert.ok(fs.existsSync(CORE), 'client core must be part of the package');
    const source = fs.readFileSync(CORE, 'utf8');
    assert.match(source, /class VanillaJetView/, 'view base class present');
    assert.match(source, /setActiveView/, 'controller view switching present');
  });

  test('view swaps stay instant — no velocity transitions can return', () => {
    const source = fs.readFileSync(CORE, 'utf8');
    assert.ok(!source.includes('.velocity('), 'velocity choreography must never come back (removed twice before and restored by accident once)');
  });
});
