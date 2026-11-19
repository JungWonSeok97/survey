// Use the production build to avoid hot-reload races, and own the server lifecycle on Windows too.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
server.stdout.on('data', data => process.stdout.write(data));
server.stderr.on('data', data => process.stderr.write(data));
let runner;
function stop() {
  if (runner && runner.exitCode === null) runner.kill();
  server.kill(); server.stdout.destroy(); server.stderr.destroy(); server.unref();
}
process.once('SIGINT', () => { stop(); process.exit(130); });
process.once('SIGTERM', () => { stop(); process.exit(143); });
try {
  let ready = false;
  for (let attempt=0; attempt<100; attempt++) {
    if (server.exitCode !== null) throw new Error('Local test server exited before startup');
    try { const response = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(500) }); if (response.ok) { ready = true; break; } } catch { /* Wait for server startup. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Local test server did not become ready');
  runner = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
    cwd: process.cwd(), stdio: 'inherit', windowsHide: true, env: { ...process.env, PLAYWRIGHT_BASE_URL: origin },
  });
  const code = await new Promise((resolve, reject) => { runner.once('exit', resolve); runner.once('error', reject); });
  stop(); process.exit(code ?? 1);
} catch (error) {
  console.error(error.message); stop(); process.exit(1);
}
