// Precompresses build outputs to .gz + .br so the server can serve any self-hosted
// asset (vendor libs, plugins, bundles, styles, pages) compressed via Accept-Encoding
// negotiation. Without this, self-hosting a large library would ship it uncompressed.
// Safe + additive: clients that don't accept br get gzip; those that accept neither
// get the original (resolveFirstAvailableStaticFile falls back).

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function processCwd() {
	return process.cwd()
		.replace('/scripts', '')
		.replace('/gulp', '')
		.replace('/node_modules/vanilla-jet', '');
}

const root = processCwd();
const DIRS = ['public/scripts', 'public/styles', 'public/pages'];
const COMPRESSIBLE = new Set(['.js', '.css', '.html']);
const BROTLI_OPTIONS = { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } };

function walk(dir, out) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (err) {
		return;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full, out);
		} else if (
			COMPRESSIBLE.has(path.extname(entry.name)) &&
			!entry.name.endsWith('.gz') &&
			!entry.name.endsWith('.br')
		) {
			out.push(full);
		}
	}
}

const files = [];
DIRS.forEach((dir) => walk(path.join(root, dir), files));

let count = 0;
files.forEach((file) => {
	try {
		const input = fs.readFileSync(file);
		fs.writeFileSync(file + '.gz', zlib.gzipSync(input, { level: 9 }));
		fs.writeFileSync(file + '.br', zlib.brotliCompressSync(input, BROTLI_OPTIONS));
		count = count + 1;
	} catch (err) {
		// Skip unreadable files; never fail the build over compression.
	}
});

console.log(`VanillaJet - precompressed ${count} assets (.gz + .br)`);
