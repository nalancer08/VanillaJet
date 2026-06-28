// Brotli-precompresses the build outputs so the server can negotiate `.br`
// (smaller than gzip). Safe + additive: the framework only serves `.br` when the
// client sends `Accept-Encoding: br`; otherwise it falls back to `.gz`/original.

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

// Same files the framework negotiates `.br` for (router static + response.render).
const TARGETS = [
	'public/scripts/vanilla.min.js',
	'public/styles/app.min.css',
	'public/pages/home.html'
];

const BROTLI_OPTIONS = {
	params: {
		[zlib.constants.BROTLI_PARAM_QUALITY]: 11,
		[zlib.constants.BROTLI_PARAM_SIZE_HINT]: 0
	}
};

TARGETS.forEach((relativePath) => {
	const filePath = path.join(root, relativePath);
	try {
		const stats = fs.statSync(filePath);
		if (!stats.isFile()) {
			return;
		}
		const input = fs.readFileSync(filePath);
		const compressed = zlib.brotliCompressSync(input, BROTLI_OPTIONS);
		fs.writeFileSync(filePath + '.br', compressed);
		console.log(`VanillaJet - brotli: ${relativePath}.br (${input.length} -> ${compressed.length} B)`);
	} catch (err) {
		// File not present (feature not built yet) — skip silently.
	}
});
