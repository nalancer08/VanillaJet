const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');

const Server = require('../framework/server.js');

const BENCH_PORT = Number(process.env.BENCH_PORT || 3199);
const BENCH_FILE_SIZE_KB = Number(process.env.BENCH_FILE_SIZE_KB || 512);
const BENCH_TOTAL_REQUESTS = Number(process.env.BENCH_TOTAL_REQUESTS || 2000);
const BENCH_COLD_ITERATIONS = Number(process.env.BENCH_COLD_ITERATIONS || 300);
const BENCH_PATH = '/public/scripts/vanilla.min.js';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function createFixtureWorkspace(rootPath) {
  ensureDir(path.join(rootPath, 'assets'));
  ensureDir(path.join(rootPath, 'public', 'scripts'));

  const bytes = BENCH_FILE_SIZE_KB * 1024;
  const filePath = path.join(rootPath, BENCH_PATH);
  const content = Buffer.alloc(bytes, 'a');
  fs.writeFileSync(filePath, content);
}

function createServerOptions(port) {
  return {
    settings: {
      profile: {
        port: port,
        https_server: false,
        enable_precompressed_negotiation: true
      },
      shared: {},
      security: {}
    }
  };
}

function percentile(values, percentileValue) {
  if (!values.length) {
    return 0;
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index];
}

function summarize(values, elapsedMs) {
  const total = values.length;
  const sum = values.reduce((acc, current) => acc + current, 0);
  return {
    count: total,
    avgMs: total ? sum / total : 0,
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
    p99Ms: percentile(values, 99),
    maxMs: values.length ? Math.max(...values) : 0,
    rps: elapsedMs > 0 ? (total * 1000) / elapsedMs : 0
  };
}

function printSummary(title, summary) {
  console.log(`\n${title}`);
  console.log(`  requests: ${summary.count}`);
  console.log(`  avg:      ${summary.avgMs.toFixed(2)} ms`);
  console.log(`  p50:      ${summary.p50Ms.toFixed(2)} ms`);
  console.log(`  p95:      ${summary.p95Ms.toFixed(2)} ms`);
  console.log(`  p99:      ${summary.p99Ms.toFixed(2)} ms`);
  console.log(`  max:      ${summary.maxMs.toFixed(2)} ms`);
  console.log(`  rps:      ${summary.rps.toFixed(2)}`);
}

function requestOnce(agent, port, headers) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: BENCH_PATH,
      method: 'GET',
      headers: headers || {},
      agent: agent
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          durationMs: performance.now() - start
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function waitForServerListening(instance) {
  if (instance && instance.httpx && instance.httpx.listening) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    instance.httpx.once('listening', resolve);
  });
}

async function runWarmBenchmark(port) {
  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: 1
  });
  const latencies = [];
  const startedAt = performance.now();
  for (let index = 0; index < BENCH_TOTAL_REQUESTS; index += 1) {
    const result = await requestOnce(agent, port, {
      'accept-encoding': 'br, gzip'
    });
    if (result.statusCode !== 200) {
      throw new Error(`Unexpected status ${result.statusCode} in warm benchmark`);
    }
    latencies.push(result.durationMs);
  }
  agent.destroy();
  return summarize(latencies, performance.now() - startedAt);
}

async function runColdBenchmark(server, port) {
  const latencies = [];
  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: 1
  });
  const startedAt = performance.now();
  for (let index = 0; index < BENCH_COLD_ITERATIONS; index += 1) {
    server.router.staticMetadataCache.clear();
    server.router.staticResolutionCache.clear();

    const sample = await requestOnce(agent, port, {
      'accept-encoding': 'br, gzip'
    });
    if (sample.statusCode !== 200) {
      throw new Error(`Unexpected status ${sample.statusCode} in cold benchmark`);
    }
    latencies.push(sample.durationMs);
  }
  agent.destroy();
  return summarize(latencies, performance.now() - startedAt);
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanillajet-bench-'));
  createFixtureWorkspace(tmpDir);
  const previousCwd = process.cwd();
  process.chdir(tmpDir);

  const server = new Server(createServerOptions(BENCH_PORT), []);
  await waitForServerListening(server);
  try {
    const warmup = await requestOnce(undefined, BENCH_PORT, {});
    if (warmup.statusCode !== 200) {
      throw new Error(`Warmup request failed with status ${warmup.statusCode}`);
    }

    const coldResult = await runColdBenchmark(server, BENCH_PORT);
    printSummary('Cold cache benchmark', coldResult);

    const warmResult = await runWarmBenchmark(BENCH_PORT);
    printSummary('Warm cache benchmark', warmResult);

    await new Promise((resolve) => {
      server.httpx.close(() => {
        resolve();
      });
    });
    process.chdir(previousCwd);

    const p95Improvement = coldResult.p95Ms > 0
      ? ((coldResult.p95Ms - warmResult.p95Ms) / coldResult.p95Ms) * 100
      : 0;
    console.log(`\nWarm p95 improvement vs cold: ${p95Improvement.toFixed(2)}%`);
  } catch (error) {
    await new Promise((resolve) => {
      server.httpx.close(() => {
        resolve();
      });
    }).catch(() => {});
    process.chdir(previousCwd);
    throw error;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('\nStatic benchmark failed');
  console.error(error);
  process.exit(1);
});
