# Static serving benchmark guide

This benchmark measures static file serving in two reproducible scenarios:

- Warm cache latency/throughput with stable keep-alive traffic.
- Cold cache latency by forcing metadata/resolution misses on each request.

## Run

```bash
npm run benchmark:static
```

## Optional tuning variables

You can override defaults with environment variables:

- `BENCH_PORT` (default: `3199`)
- `BENCH_FILE_SIZE_KB` (default: `512`)
- `BENCH_TOTAL_REQUESTS` (default: `2000`)
- `BENCH_COLD_ITERATIONS` (default: `300`)

Example:

```bash
BENCH_TOTAL_REQUESTS=4000 BENCH_COLD_ITERATIONS=600 npm run benchmark:static
```

## Output

The script reports for warm and cold scenarios:

- request count
- average latency
- `p50`, `p95`, `p99`
- max latency
- requests per second

It also prints warm `p95` improvement vs cold.

## Notes for consistent results

- Close heavy apps before running benchmarks.
- Run at least 3 times and compare medians.
- Keep the same `BENCH_*` values before/after a performance patch.
