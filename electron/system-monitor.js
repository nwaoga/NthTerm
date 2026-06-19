const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const PRIORITY_ENV_KEYS = [
  'NTH_TERM_WORKSPACE',
  'WORKSPACE',
  'USERNAME',
  'USER',
  'USERPROFILE',
  'HOME',
  'PATH',
  'SHELL',
  'COMSPEC',
  'DOTNET_ENVIRONMENT',
  'ASPNETCORE_ENVIRONMENT',
  'NODE_ENV',
  'TEMP',
  'TMP',
  'PWD',
  'TERM',
];

let previousCpuSample = null;
let previousNetworkSample = null;
let cachedDiskPercent = null;
let lastDiskCheckAt = 0;

function sampleCpuTimes() {
  let idle = 0;
  let total = 0;

  for (const cpu of os.cpus()) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }

  return { idle, total };
}

function getCpuPercent() {
  const current = sampleCpuTimes();

  if (!previousCpuSample) {
    previousCpuSample = current;
    return 0;
  }

  const idleDelta = current.idle - previousCpuSample.idle;
  const totalDelta = current.total - previousCpuSample.total;
  previousCpuSample = current;

  if (totalDelta <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100)));
}

function getMemoryMetrics() {
  const total = os.totalmem();
  const used = total - os.freemem();

  return {
    usedGb: +(used / 1024 ** 3).toFixed(1),
    percent: Math.round((used / total) * 100),
  };
}

async function getDiskPercent() {
  const now = Date.now();
  if (cachedDiskPercent !== null && now - lastDiskCheckAt < 30000) {
    return cachedDiskPercent;
  }

  try {
    if (process.platform === 'win32') {
      const { stdout } = await execFileAsync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          '$drive = Get-PSDrive -Name C -ErrorAction Stop; [math]::Round(($drive.Used / ($drive.Used + $drive.Free)) * 100)',
        ],
        { timeout: 8000 }
      );
      cachedDiskPercent = Number.parseInt(stdout.trim(), 10);
    } else {
      const fs = require('node:fs');
      const statfs = fs.statfsSync('/');
      const used = (statfs.blocks - statfs.bfree) * statfs.bsize;
      const total = statfs.blocks * statfs.bsize;
      cachedDiskPercent = Math.round((used / total) * 100);
    }

    lastDiskCheckAt = now;
  } catch {
    cachedDiskPercent = cachedDiskPercent ?? null;
  }

  return cachedDiskPercent;
}

async function readNetworkBytes() {
  if (process.platform === 'win32') {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        '(Get-NetAdapterStatistics | Where-Object { $_.Name -notlike "*Loopback*" -and $_.Name -notlike "*vEthernet*" } | Measure-Object -Property ReceivedBytes,SentBytes -Sum).Sum',
      ],
      { timeout: 8000 }
    );

    return Number.parseInt(stdout.trim(), 10) || 0;
  }

  const fs = require('node:fs');
  const lines = fs.readFileSync('/proc/net/dev', 'utf8').split('\n');
  let total = 0;

  for (const line of lines.slice(2)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('lo:')) {
      continue;
    }

    const parts = trimmed.split(/\s+/);
    const receive = Number.parseInt(parts[1], 10) || 0;
    const transmit = Number.parseInt(parts[9], 10) || 0;
    total += receive + transmit;
  }

  return total;
}

async function getNetworkMbps() {
  try {
    const bytes = await readNetworkBytes();
    const now = Date.now();

    if (!previousNetworkSample) {
      previousNetworkSample = { bytes, at: now };
      return null;
    }

    const elapsedSeconds = (now - previousNetworkSample.at) / 1000;
    const byteDelta = Math.max(0, bytes - previousNetworkSample.bytes);
    previousNetworkSample = { bytes, at: now };

    if (elapsedSeconds <= 0) {
      return null;
    }

    const mbps = (byteDelta * 8) / elapsedSeconds / 1_000_000;
    return +mbps.toFixed(1);
  } catch {
    return null;
  }
}

function truncateValue(name, value) {
  if (name === 'PATH' && value.length > 72) {
    return `…${value.slice(-69)}`;
  }

  if (value.length > 96) {
    return `${value.slice(0, 93)}…`;
  }

  return value;
}

function formatEnvironment(env) {
  const entries = Object.entries(env || {})
    .filter(([name]) => name)
    .map(([name, value]) => ({
      name,
      value: truncateValue(name, String(value ?? '')),
    }));

  const priority = new Map(PRIORITY_ENV_KEYS.map((name, index) => [name, index]));

  return entries.sort((left, right) => {
    const leftRank = priority.has(left.name) ? priority.get(left.name) : Number.MAX_SAFE_INTEGER;
    const rightRank = priority.has(right.name) ? priority.get(right.name) : Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.name.localeCompare(right.name);
  });
}

async function getSystemMetrics() {
  const memory = getMemoryMetrics();
  const [diskPercent, networkMbps] = await Promise.all([getDiskPercent(), getNetworkMbps()]);

  return {
    cpuPercent: getCpuPercent(),
    memoryUsedGb: memory.usedGb,
    memoryPercent: memory.percent,
    diskPercent,
    networkMbps,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = {
  formatEnvironment,
  getSystemMetrics,
};
