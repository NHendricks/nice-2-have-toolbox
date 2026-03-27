/**
 * System Monitor Command
 * Returns top resource-consuming processes for CPU or memory.
 */

import { exec } from 'child_process';
import { readFile, readdir } from 'fs/promises';
import os from 'os';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface.js';

const execAsync = promisify(exec);

/** Absolute path to System32 — child processes spawned by Electron may not have it on PATH. */
const SYS32 = `${process.env.SystemRoot || 'C:\\Windows'}\\System32`;

type ResourceMetric = 'cpu' | 'memory' | 'io';

interface ProcessUsage {
  pid: number;
  name: string;
  command: string;
  cpu: number;
  memoryMB: number;
  ioMB: number;
}

interface ResourceAvailability {
  cpuFreePercent: number | null;
  cpuUsedPercent: number | null;
  memoryFreeMB: number | null;
  memoryUsedMB: number | null;
  memoryTotalMB: number | null;
  diskFreeGB: number | null;
  diskUsedGB: number | null;
  diskTotalGB: number | null;
}

interface OpenPort {
  protocol: string;
  localAddress: string;
  localPort: number;
  pid: number;
  processName: string;
}

interface FileHandleResult {
  pid: number;
  name: string;
  command: string;
}

interface MonitorResponse {
  success: boolean;
  metric?: ResourceMetric;
  updatedAt?: string;
  entries?: ProcessUsage[];
  diskIoMBps?: number | null;
  resources?: ResourceAvailability;
  openPorts?: OpenPort[];
  fileHandles?: FileHandleResult[];
  warning?: string;
  error?: string;
}

export class SystemMonitorCommand implements ICommand {
  /** Cached PowerShell binary name (resolved once, then reused). */
  private resolvedPsShell: string | null = null;

  /** Whether the WMI perf counter warm-up has been triggered. */
  private wmiWarmedUp = false;

  constructor() {
    // Pre-warm WMI performance counters in the background on Windows.
    // The first query to Win32_PerfFormattedData_PerfProc_Process can take
    // 10-30s while Windows initialises perf counters; subsequent queries
    // return in <1s.  By triggering this at construction time the counters
    // are ready by the time the user opens System Monitor.
    this.prewarmWmiCounters();
  }

  private prewarmWmiCounters(): void {
    if (process.platform !== 'win32' || this.wmiWarmedUp) return;
    this.wmiWarmedUp = true;

    const shell = `${SYS32}\\WindowsPowerShell\\v1.0\\powershell.exe`;
    const script =
      'Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Select-Object -First 1 | Out-Null';
    const encoded = Buffer.from(script, 'utf16le').toString('base64');

    // Fire-and-forget — we don't need the result, just the side-effect
    // of warming up the WMI perf provider.  Use the already-imported `exec`.
    const child = exec(
      `"${shell}" -NoProfile -EncodedCommand ${encoded}`,
      { timeout: 45000 },
      () => {
        /* ignore result */
      },
    );
    child.unref?.();
  }

  getDescription(): string {
    return 'System monitor: top CPU/memory process usage';
  }

  getParameters(): CommandParameter[] {
    return [
      {
        name: 'action',
        type: 'select',
        description: 'Action to perform',
        required: true,
        options: [
          'top-processes',
          'kill-process',
          'open-ports',
          'find-file-handle',
        ],
        default: 'top-processes',
      },
      {
        name: 'metric',
        type: 'select',
        description: 'Sort metric',
        required: false,
        options: ['cpu', 'memory', 'io'],
        default: 'cpu',
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum process count',
        required: false,
        default: 8,
      },
      {
        name: 'pid',
        type: 'number',
        description: 'Process ID to kill (for kill-process action)',
        required: false,
      },
      {
        name: 'filePath',
        type: 'string',
        description:
          'File path to check for locking processes (for find-file-handle action)',
        required: false,
      },
    ];
  }

  async execute(params: any): Promise<MonitorResponse> {
    const action = params?.action || 'top-processes';
    const metric: ResourceMetric =
      params?.metric === 'memory'
        ? 'memory'
        : params?.metric === 'io'
          ? 'io'
          : 'cpu';
    const parsedLimit = Number(params?.limit);
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(3, Math.min(20, Math.floor(parsedLimit)))
      : 8;

    try {
      if (action === 'kill-process') {
        return await this.killProcess(params?.pid);
      }

      if (action === 'find-file-handle') {
        const filePath = params?.filePath;
        if (!filePath || typeof filePath !== 'string') {
          return { success: false, error: 'File path is required' };
        }
        const fileHandles = await this.findFileHandles(filePath.trim());
        return {
          success: true,
          updatedAt: new Date().toISOString(),
          fileHandles,
        };
      }

      if (action === 'open-ports') {
        const openPorts = await this.getOpenPorts();
        return {
          success: true,
          updatedAt: new Date().toISOString(),
          openPorts,
        };
      }

      if (action !== 'top-processes') {
        throw new Error(`Unknown action: ${action}`);
      }

      const diskIoMBps = await this.getGlobalDiskIoMBps();

      if (metric === 'io' && process.platform !== 'win32') {
        const resources = await this.getResourceAvailability();
        return {
          success: true,
          metric,
          updatedAt: new Date().toISOString(),
          entries: [],
          diskIoMBps,
          resources,
          warning:
            'Per-process File I/O is not available on this platform yet. Showing global disk I/O instead.',
        };
      }

      // On Windows, combine all PowerShell queries into a single invocation
      // to avoid spawning multiple powershell.exe processes (each cold-start
      // adds ~1-2s).  Resource availability and process list run in parallel.
      if (process.platform === 'win32') {
        const result = await this.getWindowsDataCombined(metric, limit);
        return {
          success: true,
          metric,
          updatedAt: new Date().toISOString(),
          entries: result.entries,
          diskIoMBps,
          resources: result.resources,
        };
      }

      // Non-Windows: run in parallel
      const [resources, entries] = await Promise.all([
        this.getResourceAvailability(),
        this.getTopProcesses(metric, limit),
      ]);
      return {
        success: true,
        metric,
        updatedAt: new Date().toISOString(),
        entries,
        diskIoMBps,
        resources,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async killProcess(pid: any): Promise<MonitorResponse> {
    const numPid = Number(pid);
    if (
      !Number.isFinite(numPid) ||
      numPid <= 0 ||
      Math.floor(numPid) !== numPid
    ) {
      return { success: false, error: 'Invalid PID' };
    }
    try {
      if (process.platform === 'win32') {
        await execAsync(`"${SYS32}\\taskkill.exe" /PID ${numPid} /F`, {
          timeout: 5000,
        });
      } else {
        process.kill(numPid, 'SIGTERM');
      }
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to kill process',
      };
    }
  }

  private async getGlobalDiskIoMBps(): Promise<number | null> {
    try {
      if (process.platform === 'darwin') {
        return await this.getGlobalDiskIoMBpsMac();
      }
      if (process.platform === 'linux') {
        return await this.getGlobalDiskIoMBpsLinux();
      }
      return null;
    } catch {
      return null;
    }
  }

  private async getResourceAvailability(): Promise<ResourceAvailability> {
    const [cpu, disk] = await Promise.all([
      this.getCpuAvailability(),
      this.getDiskAvailability(),
    ]);

    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = Math.max(0, totalMemBytes - freeMemBytes);

    return {
      cpuFreePercent: cpu.free,
      cpuUsedPercent: cpu.used,
      memoryFreeMB: this.bytesToMB(freeMemBytes),
      memoryUsedMB: this.bytesToMB(usedMemBytes),
      memoryTotalMB: this.bytesToMB(totalMemBytes),
      diskFreeGB: disk.freeGB,
      diskUsedGB: disk.usedGB,
      diskTotalGB: disk.totalGB,
    };
  }

  private async getCpuAvailability(): Promise<{
    free: number | null;
    used: number | null;
  }> {
    try {
      const start = this.readCpuTimes();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const end = this.readCpuTimes();

      const idleDelta = end.idle - start.idle;
      const totalDelta = end.total - start.total;
      if (totalDelta <= 0) {
        return { free: null, used: null };
      }

      const free = Math.max(0, Math.min(100, (idleDelta / totalDelta) * 100));
      const used = Math.max(0, Math.min(100, 100 - free));
      return {
        free: Number(free.toFixed(1)),
        used: Number(used.toFixed(1)),
      };
    } catch {
      return { free: null, used: null };
    }
  }

  private readCpuTimes(): { idle: number; total: number } {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      idle += cpu.times.idle;
      total +=
        cpu.times.user +
        cpu.times.nice +
        cpu.times.sys +
        cpu.times.idle +
        cpu.times.irq;
    }

    return { idle, total };
  }

  private async getDiskAvailability(): Promise<{
    freeGB: number | null;
    usedGB: number | null;
    totalGB: number | null;
  }> {
    try {
      if (process.platform === 'win32') {
        return await this.getDiskAvailabilityWindows();
      }
      return await this.getDiskAvailabilityUnix();
    } catch {
      return { freeGB: null, usedGB: null, totalGB: null };
    }
  }

  private async getDiskAvailabilityWindows(): Promise<{
    freeGB: number | null;
    usedGB: number | null;
    totalGB: number | null;
  }> {
    const query =
      'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object Size,FreeSpace | ConvertTo-Json -Depth 3';
    const raw = await this.runPowerShellJson(query, 9000);
    const list = Array.isArray(raw) ? raw : [raw];

    let totalBytes = 0;
    let freeBytes = 0;
    for (const item of list) {
      const size = Number(item?.Size || 0);
      const free = Number(item?.FreeSpace || 0);
      if (Number.isFinite(size) && size > 0) {
        totalBytes += size;
        freeBytes += Number.isFinite(free) ? Math.max(0, free) : 0;
      }
    }

    if (totalBytes <= 0) {
      return { freeGB: null, usedGB: null, totalGB: null };
    }

    const usedBytes = Math.max(0, totalBytes - freeBytes);
    return {
      freeGB: this.bytesToGB(freeBytes),
      usedGB: this.bytesToGB(usedBytes),
      totalGB: this.bytesToGB(totalBytes),
    };
  }

  private async getDiskAvailabilityUnix(): Promise<{
    freeGB: number | null;
    usedGB: number | null;
    totalGB: number | null;
  }> {
    const { stdout } = await execAsync('df -kP', {
      timeout: 7000,
      maxBuffer: 1024 * 1024,
    });

    const lines = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length <= 1) {
      return { freeGB: null, usedGB: null, totalGB: null };
    }

    let totalKB = 0;
    let availKB = 0;
    for (const line of lines.slice(1)) {
      const parts = line.split(/\s+/);
      if (parts.length < 6) {
        continue;
      }

      const filesystem = parts[0] || '';
      if (!filesystem.startsWith('/dev/')) {
        continue;
      }

      const blocksKB = Number(parts[1]);
      const availableKB = Number(parts[3]);
      if (!Number.isFinite(blocksKB) || blocksKB <= 0) {
        continue;
      }

      totalKB += blocksKB;
      if (Number.isFinite(availableKB)) {
        availKB += Math.max(0, availableKB);
      }
    }

    if (totalKB <= 0) {
      return { freeGB: null, usedGB: null, totalGB: null };
    }

    const usedKB = Math.max(0, totalKB - availKB);
    return {
      freeGB: this.kilobytesToGB(availKB),
      usedGB: this.kilobytesToGB(usedKB),
      totalGB: this.kilobytesToGB(totalKB),
    };
  }

  private bytesToMB(value: number): number {
    return Number((value / (1024 * 1024)).toFixed(1));
  }

  private bytesToGB(value: number): number {
    return Number((value / (1024 * 1024 * 1024)).toFixed(2));
  }

  private kilobytesToGB(value: number): number {
    return Number((value / (1024 * 1024)).toFixed(2));
  }

  private async getGlobalDiskIoMBpsMac(): Promise<number | null> {
    const { stdout } = await execAsync('iostat -d -w 1 -c 2', {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });

    const lines = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return null;
    }

    const valueLine = lines[lines.length - 1];
    const values = valueLine
      .split(/\s+/)
      .map((part) => Number(part))
      .filter((part) => Number.isFinite(part));

    if (values.length < 3) {
      return null;
    }

    let mbPerSecond = 0;
    for (let index = 2; index < values.length; index += 3) {
      mbPerSecond += values[index] || 0;
    }

    return Number.isFinite(mbPerSecond) ? Math.max(0, mbPerSecond) : null;
  }

  private async getGlobalDiskIoMBpsLinux(): Promise<number | null> {
    const blockDevices = await this.getLinuxBlockDevices();
    if (blockDevices.size === 0) {
      return null;
    }

    const first = await this.readLinuxDiskSectorSnapshot(blockDevices);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const second = await this.readLinuxDiskSectorSnapshot(blockDevices);

    const deltaRead = Math.max(0, second.readSectors - first.readSectors);
    const deltaWrite = Math.max(0, second.writeSectors - first.writeSectors);
    const totalBytes = (deltaRead + deltaWrite) * 512;
    const mbPerSecond = totalBytes / (1024 * 1024);

    return Number.isFinite(mbPerSecond) ? Math.max(0, mbPerSecond) : null;
  }

  private async getLinuxBlockDevices(): Promise<Set<string>> {
    const entries = await readdir('/sys/block');
    const allowed = new Set<string>();

    for (const name of entries) {
      if (
        name.startsWith('loop') ||
        name.startsWith('ram') ||
        name.startsWith('fd') ||
        name.startsWith('sr') ||
        name.startsWith('dm-')
      ) {
        continue;
      }
      allowed.add(name);
    }

    return allowed;
  }

  private async readLinuxDiskSectorSnapshot(
    blockDevices: Set<string>,
  ): Promise<{ readSectors: number; writeSectors: number }> {
    const content = await readFile('/proc/diskstats', 'utf8');
    let readSectors = 0;
    let writeSectors = 0;

    for (const line of content.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 10) {
        continue;
      }

      const deviceName = parts[2];
      if (!blockDevices.has(deviceName)) {
        continue;
      }

      const sectorsRead = Number(parts[5]);
      const sectorsWritten = Number(parts[9]);
      if (Number.isFinite(sectorsRead)) {
        readSectors += sectorsRead;
      }
      if (Number.isFinite(sectorsWritten)) {
        writeSectors += sectorsWritten;
      }
    }

    return { readSectors, writeSectors };
  }

  private async getTopProcesses(
    metric: ResourceMetric,
    limit: number,
  ): Promise<ProcessUsage[]> {
    if (process.platform === 'win32') {
      return this.getTopProcessesWindows(metric, limit);
    }
    return this.getTopProcessesUnix(metric, limit);
  }

  private async getTopProcessesUnix(
    metric: ResourceMetric,
    limit: number,
  ): Promise<ProcessUsage[]> {
    if (metric === 'io') {
      throw new Error(
        'File I/O metric is currently supported on Windows only.',
      );
    }

    const { stdout } = await execAsync(
      `ps -axo pid=,%cpu=,rss=,comm=,args= | sort -nrk${metric === 'cpu' ? '2' : '3'} | head -n ${limit}`,
      { timeout: 5000 },
    );

    const entries = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const match = line.match(/^(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s*(.*)$/);
        if (!match) return null;

        const pid = Number(match[1]);
        const cpu = Number(match[2]);
        const rssKb = Number(match[3]);
        const processName = match[4] || 'unknown';
        const command = (match[5] || '').trim() || processName;

        if (!Number.isFinite(pid)) return null;

        return {
          pid,
          name: processName,
          command,
          cpu: Number.isFinite(cpu) ? Math.max(0, cpu) : 0,
          memoryMB: Number.isFinite(rssKb) ? Math.max(0, rssKb / 1024) : 0,
          ioMB: 0,
        } as ProcessUsage;
      })
      .filter((item): item is ProcessUsage => !!item)
      .sort((a, b) =>
        metric === 'cpu'
          ? b.cpu - a.cpu
          : metric === 'memory'
            ? b.memoryMB - a.memoryMB
            : b.ioMB - a.ioMB,
      )
      .slice(0, limit);

    return entries;
  }

  private async getTopProcessesWindows(
    metric: ResourceMetric,
    limit: number,
  ): Promise<ProcessUsage[]> {
    // Win32_Process is fast and always available — use it for memory.
    // Win32_PerfFormattedData_PerfProc_Process requires WMI perf counters which
    // can take 15-30s to initialise on cold start; only use it for CPU and IO.
    if (metric === 'memory') {
      return this.getTopProcessesWindowsMemory(limit);
    }

    // CPU / IO: PerfData query — increase timeout to survive WMI cold start
    const perfDataQuery =
      'Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.IDProcess -gt 0 -and $_.Name -ne "_Total" -and $_.Name -ne "Idle" } | Select-Object IDProcess,Name,PercentProcessorTime,WorkingSetPrivate,IODataBytesPersec | ConvertTo-Json -Depth 3';
    const perfRaw = await this.runPowerShellJson(perfDataQuery, 30000);
    const perfList = Array.isArray(perfRaw) ? perfRaw : [perfRaw];

    const commandMap = new Map<number, string>();
    try {
      const commandLineQuery =
        'Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine | ConvertTo-Json -Depth 3';
      const commandRaw = await this.runPowerShellJson(commandLineQuery, 15000);
      const commandList = Array.isArray(commandRaw) ? commandRaw : [commandRaw];
      for (const item of commandList) {
        const pid = Number(item?.ProcessId);
        const commandLine = String(item?.CommandLine || '').trim();
        if (Number.isFinite(pid) && commandLine) {
          commandMap.set(pid, commandLine);
        }
      }
    } catch {
      // ignore command line enrichment failure
    }

    const numCpus = os.cpus().length || 1;
    const entries = perfList
      .map((item: any) => {
        const pid = Number(item?.IDProcess);
        const processName = String(item?.Name || 'unknown');
        const cpuRaw = Number(item?.PercentProcessorTime || 0);
        const cpu = cpuRaw / numCpus;
        const memoryMB = Number(item?.WorkingSetPrivate || 0) / (1024 * 1024);
        const ioBytesPersec = Number(item?.IODataBytesPersec || 0);
        const ioMB = ioBytesPersec / (1024 * 1024);

        if (!Number.isFinite(pid)) return null;

        return {
          pid,
          name: processName,
          command: commandMap.get(pid) || processName,
          cpu: Number.isFinite(cpu) ? Math.max(0, cpu) : 0,
          memoryMB: Number.isFinite(memoryMB) ? Math.max(0, memoryMB) : 0,
          ioMB: Number.isFinite(ioMB) ? Math.max(0, ioMB) : 0,
        } as ProcessUsage;
      })
      .filter((item: ProcessUsage | null): item is ProcessUsage => !!item)
      .sort((a, b) => (metric === 'cpu' ? b.cpu - a.cpu : b.ioMB - a.ioMB))
      .slice(0, limit);

    return entries;
  }

  private async getTopProcessesWindowsMemory(
    limit: number,
  ): Promise<ProcessUsage[]> {
    // Win32_Process is available immediately without WMI perf-counter warm-up
    const query =
      'Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -gt 0 } | Select-Object ProcessId,Name,WorkingSetSize,CommandLine | ConvertTo-Json -Depth 3';
    const raw = await this.runPowerShellJson(query, 15000);
    const list = Array.isArray(raw) ? raw : [raw];

    return list
      .map((item: any) => {
        const pid = Number(item?.ProcessId);
        const processName = String(item?.Name || 'unknown');
        const memoryMB = Number(item?.WorkingSetSize || 0) / (1024 * 1024);
        const command = String(item?.CommandLine || processName).trim();
        if (!Number.isFinite(pid)) return null;
        return {
          pid,
          name: processName,
          command: command || processName,
          cpu: 0,
          memoryMB: Number.isFinite(memoryMB) ? Math.max(0, memoryMB) : 0,
          ioMB: 0,
        } as ProcessUsage;
      })
      .filter((item): item is ProcessUsage => !!item)
      .sort((a, b) => b.memoryMB - a.memoryMB)
      .slice(0, limit);
  }

  /**
   * Combined Windows query: fetches process data + disk availability in a
   * SINGLE PowerShell invocation.  This avoids spawning 2-3 separate
   * powershell.exe processes (each cold-start adds ~1-2s overhead).
   *
   * For the memory metric we only need Win32_Process (fast).
   * For cpu/io we need Win32_PerfFormattedData_PerfProc_Process (slow on
   * first access) + Win32_Process for CommandLine enrichment.
   * Disk availability (Win32_LogicalDisk) is always included.
   */
  private async getWindowsDataCombined(
    metric: ResourceMetric,
    limit: number,
  ): Promise<{ entries: ProcessUsage[]; resources: ResourceAvailability }> {
    // Build a PowerShell script that outputs a JSON object with all data.
    // Each sub-query is wrapped in try/catch so a single failure doesn't
    // break the whole response.
    const psScript =
      metric === 'memory'
        ? `
$disk = try { Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object Size,FreeSpace } catch { @() }
$proc = try { Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -gt 0 } | Select-Object ProcessId,Name,WorkingSetSize,CommandLine } catch { @() }
@{ disk=$disk; proc=$proc } | ConvertTo-Json -Depth 3 -Compress
`.trim()
        : `
$disk = try { Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object Size,FreeSpace } catch { @() }
$perf = try { Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.IDProcess -gt 0 -and $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } | Select-Object IDProcess,Name,PercentProcessorTime,WorkingSetPrivate,IODataBytesPersec } catch { @() }
$cmd  = try { Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine } catch { @() }
@{ disk=$disk; perf=$perf; cmd=$cmd } | ConvertTo-Json -Depth 3 -Compress
`.trim();

    // CPU/IO query can take longer (WMI perf counter cold-start)
    const timeout = metric === 'memory' ? 15000 : 30000;

    // Measure CPU BEFORE launching the heavy PS query so the measurement
    // is not skewed by the PowerShell/WMI process itself.
    const cpu = await this.getCpuAvailability();

    const raw = await this.runPowerShellJson(psScript, timeout);

    // --- Parse disk availability ---
    const diskList = Array.isArray(raw?.disk)
      ? raw.disk
      : raw?.disk
        ? [raw.disk]
        : [];
    let totalBytes = 0;
    let freeBytes = 0;
    for (const item of diskList) {
      const size = Number(item?.Size || 0);
      const free = Number(item?.FreeSpace || 0);
      if (Number.isFinite(size) && size > 0) {
        totalBytes += size;
        freeBytes += Number.isFinite(free) ? Math.max(0, free) : 0;
      }
    }
    const usedBytes = Math.max(0, totalBytes - freeBytes);

    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = Math.max(0, totalMemBytes - freeMemBytes);

    const resources: ResourceAvailability = {
      cpuFreePercent: cpu.free,
      cpuUsedPercent: cpu.used,
      memoryFreeMB: this.bytesToMB(freeMemBytes),
      memoryUsedMB: this.bytesToMB(usedMemBytes),
      memoryTotalMB: this.bytesToMB(totalMemBytes),
      diskFreeGB: totalBytes > 0 ? this.bytesToGB(freeBytes) : null,
      diskUsedGB: totalBytes > 0 ? this.bytesToGB(usedBytes) : null,
      diskTotalGB: totalBytes > 0 ? this.bytesToGB(totalBytes) : null,
    };

    // --- Parse process entries ---
    let entries: ProcessUsage[];

    if (metric === 'memory') {
      const procList = Array.isArray(raw?.proc)
        ? raw.proc
        : raw?.proc
          ? [raw.proc]
          : [];
      entries = procList
        .map((item: any) => {
          const pid = Number(item?.ProcessId);
          const processName = String(item?.Name || 'unknown');
          const memoryMB = Number(item?.WorkingSetSize || 0) / (1024 * 1024);
          const command = String(item?.CommandLine || processName).trim();
          if (!Number.isFinite(pid)) return null;
          return {
            pid,
            name: processName,
            command: command || processName,
            cpu: 0,
            memoryMB: Number.isFinite(memoryMB) ? Math.max(0, memoryMB) : 0,
            ioMB: 0,
          } as ProcessUsage;
        })
        .filter((item: ProcessUsage | null): item is ProcessUsage => !!item)
        .sort((a: ProcessUsage, b: ProcessUsage) => b.memoryMB - a.memoryMB)
        .slice(0, limit);
    } else {
      // cpu / io
      const perfList = Array.isArray(raw?.perf)
        ? raw.perf
        : raw?.perf
          ? [raw.perf]
          : [];
      const cmdList = Array.isArray(raw?.cmd)
        ? raw.cmd
        : raw?.cmd
          ? [raw.cmd]
          : [];

      const commandMap = new Map<number, string>();
      for (const item of cmdList) {
        const pid = Number(item?.ProcessId);
        const commandLine = String(item?.CommandLine || '').trim();
        if (Number.isFinite(pid) && commandLine) {
          commandMap.set(pid, commandLine);
        }
      }

      const numCpus = os.cpus().length || 1;
      entries = perfList
        .map((item: any) => {
          const pid = Number(item?.IDProcess);
          const processName = String(item?.Name || 'unknown');
          const cpuRaw = Number(item?.PercentProcessorTime || 0);
          const cpuVal = cpuRaw / numCpus;
          const memoryMB = Number(item?.WorkingSetPrivate || 0) / (1024 * 1024);
          const ioBytesPersec = Number(item?.IODataBytesPersec || 0);
          const ioMB = ioBytesPersec / (1024 * 1024);

          if (!Number.isFinite(pid)) return null;

          return {
            pid,
            name: processName,
            command: commandMap.get(pid) || processName,
            cpu: Number.isFinite(cpuVal) ? Math.max(0, cpuVal) : 0,
            memoryMB: Number.isFinite(memoryMB) ? Math.max(0, memoryMB) : 0,
            ioMB: Number.isFinite(ioMB) ? Math.max(0, ioMB) : 0,
          } as ProcessUsage;
        })
        .filter((item: ProcessUsage | null): item is ProcessUsage => !!item)
        .sort((a: ProcessUsage, b: ProcessUsage) =>
          metric === 'cpu' ? b.cpu - a.cpu : b.ioMB - a.ioMB,
        )
        .slice(0, limit);
    }

    // Fallback: if CPU free reads as 0 (e.g. WMI cold-start skews the
    // os.cpus() measurement), estimate it from the process list instead:
    // free ≈ 100% − sum of top-process CPU values.
    if (
      metric === 'cpu' &&
      (resources.cpuFreePercent === null || resources.cpuFreePercent === 0) &&
      entries.length > 0
    ) {
      const sumCpu = entries.reduce((s, e) => s + e.cpu, 0);
      const estimated = Math.max(0, Math.min(100, 100 - sumCpu));
      resources.cpuFreePercent = Number(estimated.toFixed(1));
      resources.cpuUsedPercent = Number(Math.min(100, sumCpu).toFixed(1));
    }

    return { entries, resources };
  }

  /** Return the PowerShell executable to use. */
  private getPowerShell(): string {
    // Windows always ships powershell.exe (Windows PowerShell 5.1).
    // Use the full path so it works even when the child-process PATH
    // differs from the interactive shell (common inside Electron).
    if (process.platform === 'win32') {
      return `${SYS32}\\WindowsPowerShell\\v1.0\\powershell.exe`;
    }
    // macOS / Linux: prefer pwsh (PowerShell Core), fall back to powershell
    return this.resolvedPsShell || 'pwsh';
  }

  private async runPowerShellJson(
    script: string,
    timeout: number,
  ): Promise<any> {
    const shell = this.getPowerShell();

    // Use -EncodedCommand (Base64-encoded UTF-16LE) so that multi-line
    // scripts, single quotes, dollar signs, etc. are passed through
    // without any escaping issues.
    const encoded = Buffer.from(script, 'utf16le').toString('base64');

    try {
      const { stdout } = await execAsync(
        `"${shell}" -NoProfile -EncodedCommand ${encoded}`,
        { timeout, maxBuffer: 10 * 1024 * 1024 },
      );
      const trimmed = (stdout || '').trim();
      if (!trimmed) {
        return [];
      }
      // PowerShell may prepend CLIXML progress output (e.g. "Module werden
      // vorbereitet") before the JSON.  Strip everything before the first
      // '{' or '[' to isolate the JSON payload.
      const jsonStart = trimmed.search(/[{\[]/);
      if (jsonStart < 0) {
        return [];
      }
      return JSON.parse(trimmed.substring(jsonStart));
    } catch (error: any) {
      const msg = error?.message || String(error) || 'Unbekannt';
      const isTimeout =
        error?.killed ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('timed out') ||
        msg.includes('timeout');
      if (isTimeout) {
        throw new Error(
          'WMI-Abfrage hat zu lange gedauert (Windows Performance Counter braucht beim ersten Start bis zu 30 Sekunden). Bitte erneut versuchen.',
        );
      }
      throw new Error(
        'PowerShell konnte nicht ausgeführt werden. Ursprünglicher Fehler: ' +
          msg,
      );
    }
  }

  private async findFileHandles(filePath: string): Promise<FileHandleResult[]> {
    if (process.platform === 'win32') {
      return this.findFileHandlesWindows(filePath);
    }
    return this.findFileHandlesUnix(filePath);
  }

  private async findFileHandlesWindows(
    filePath: string,
  ): Promise<FileHandleResult[]> {
    const escapedPath = filePath.replace(/'/g, "''");
    const script = `
$ErrorActionPreference = 'Stop'
Add-Type @'
using System; using System.Collections.Generic; using System.Runtime.InteropServices;
public static class RmApi {
  [StructLayout(LayoutKind.Sequential)]
  public struct RM_UNIQUE_PROCESS { public int dwProcessId; public System.Runtime.InteropServices.ComTypes.FILETIME ProcessStartTime; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct RM_PROCESS_INFO {
    public RM_UNIQUE_PROCESS Process;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=256)] public string strAppName;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=64)] public string strServiceShortName;
    public int ApplicationType; public int AppStatus; public int TSSessionId;
    [MarshalAs(UnmanagedType.Bool)] public bool bRestartable;
  }
  [DllImport("rstrtmgr.dll",CharSet=CharSet.Unicode)] static extern int RmStartSession(out uint h,int f,string k);
  [DllImport("rstrtmgr.dll")] static extern int RmEndSession(uint h);
  [DllImport("rstrtmgr.dll",CharSet=CharSet.Unicode)] static extern int RmRegisterResources(uint h,uint nF,string[] f,uint nA,RM_UNIQUE_PROCESS[] a,uint nS,string[] s);
  [DllImport("rstrtmgr.dll")] static extern int RmGetList(uint h,out uint needed,ref uint count,[In,Out] RM_PROCESS_INFO[] info,ref uint reasons);
  public static RM_PROCESS_INFO[] Find(string path) {
    uint h; string k=Guid.NewGuid().ToString();
    if(RmStartSession(out h,0,k)!=0) return new RM_PROCESS_INFO[0];
    try {
      if(RmRegisterResources(h,1,new[]{path},0,null,0,null)!=0) return new RM_PROCESS_INFO[0];
      uint needed=0,count=0,reasons=0;
      int r=RmGetList(h,out needed,ref count,null,ref reasons);
      if(r==234 && needed>0){
        var info=new RM_PROCESS_INFO[needed]; count=needed;
        if(RmGetList(h,out needed,ref count,info,ref reasons)==0){ var result=new RM_PROCESS_INFO[count]; Array.Copy(info,result,count); return result; }
      }
      return new RM_PROCESS_INFO[0];
    } finally { RmEndSession(h); }
  }
}
'@
$results = [RmApi]::Find('${escapedPath}')
$output = @()
foreach($r in $results) {
  $rpid = $r.Process.dwProcessId
  $p = try { Get-Process -Id $rpid -ErrorAction SilentlyContinue } catch { $null }
  $output += @{ pid=$rpid; name=$r.strAppName; command=if($p -and $p.Path){$p.Path}else{$r.strAppName} }
}
if($output.Count -eq 0){'[]'}elseif($output.Count -eq 1){'['+($output[0]|ConvertTo-Json -Depth 3 -Compress)+']'}else{$output|ConvertTo-Json -Depth 3 -Compress}
`.trim();

    const raw = await this.runPowerShellJson(script, 15000);
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return list
      .map((item: any) => ({
        pid: Number(item?.pid || 0),
        name: String(item?.name || 'unknown'),
        command: String(item?.command || item?.name || 'unknown'),
      }))
      .filter(
        (item: FileHandleResult) => Number.isFinite(item.pid) && item.pid > 0,
      );
  }

  private async findFileHandlesUnix(
    filePath: string,
  ): Promise<FileHandleResult[]> {
    const escapedPath = filePath.replace(/'/g, "'\\''");

    try {
      const { stdout } = await execAsync(`lsof '${escapedPath}' 2>/dev/null`, {
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      });

      const lines = stdout.trim().split('\n');
      if (lines.length <= 1) return [];

      const seen = new Set<number>();
      const results: FileHandleResult[] = [];

      for (const line of lines.slice(1)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;

        const name = parts[0];
        const pid = Number(parts[1]);

        if (!Number.isFinite(pid) || pid <= 0 || seen.has(pid)) continue;
        seen.add(pid);

        let command = name;
        try {
          const { stdout: cmdline } = await execAsync(`ps -p ${pid} -o args=`, {
            timeout: 2000,
          });
          if (cmdline.trim()) command = cmdline.trim();
        } catch {
          /* ignore */
        }

        results.push({ pid, name, command });
      }

      return results;
    } catch {
      return [];
    }
  }

  private async getOpenPorts(): Promise<OpenPort[]> {
    try {
      if (process.platform === 'win32') {
        return await this.getOpenPortsWindows();
      } else if (process.platform === 'darwin') {
        return await this.getOpenPortsMac();
      } else {
        return await this.getOpenPortsLinux();
      }
    } catch {
      return [];
    }
  }

  private async getOpenPortsWindows(): Promise<OpenPort[]> {
    // Get listening TCP ports via netstat
    const { stdout: netstatOut } = await execAsync(
      `"${SYS32}\\netstat.exe" -ano -p TCP`,
      {
        encoding: 'utf8',
        timeout: 10000,
      },
    );

    const lines = netstatOut.trim().split('\n');
    const portEntries: {
      localAddress: string;
      localPort: number;
      pid: number;
    }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('TCP')) continue;
      // Format: TCP    0.0.0.0:port    0.0.0.0:0    LISTENING    pid
      // On localized Windows: LISTENING = ABHÖREN (DE), ÉCOUTE (FR), etc.
      const parts = trimmed.split(/\s+/);
      if (parts.length < 5) continue;
      // Status is at index 3; PID at last position. Skip non-listening states.
      const pid = parseInt(parts[parts.length - 1], 10);
      // Listening states have remote address 0.0.0.0:0 or [::]:0
      const remoteAddr = parts[2];
      if (!remoteAddr.endsWith(':0')) continue;

      const localPart = parts[1];
      const lastColon = localPart.lastIndexOf(':');
      if (lastColon === -1) continue;

      const localAddress = localPart.substring(0, lastColon);
      const localPort = parseInt(localPart.substring(lastColon + 1), 10);

      if (!isNaN(localPort) && !isNaN(pid)) {
        portEntries.push({ localAddress, localPort, pid });
      }
    }

    // Resolve PIDs to process names via tasklist
    const uniquePids = [...new Set(portEntries.map((e) => e.pid))];
    const pidNameMap = new Map<number, string>();

    if (uniquePids.length > 0) {
      try {
        const { stdout: tasklistOut } = await execAsync(
          `"${SYS32}\\tasklist.exe" /FO CSV /NH`,
          { encoding: 'utf8', timeout: 10000 },
        );
        for (const tLine of tasklistOut.trim().split('\n')) {
          // Format: "name.exe","pid","Session","SessionNum","Mem"
          const match = tLine.match(/^"([^"]+)","(\d+)"/);
          if (match) {
            pidNameMap.set(parseInt(match[2], 10), match[1]);
          }
        }
      } catch {
        // Fallback: no process names
      }
    }

    return portEntries
      .map((e) => ({
        protocol: 'TCP',
        localAddress: e.localAddress,
        localPort: e.localPort,
        pid: e.pid,
        processName: pidNameMap.get(e.pid) || `PID ${e.pid}`,
      }))
      .sort((a, b) => a.localPort - b.localPort);
  }

  private async getOpenPortsMac(): Promise<OpenPort[]> {
    const { stdout } = await execAsync('lsof -iTCP -sTCP:LISTEN -P -n -F pcn', {
      encoding: 'utf8',
      timeout: 10000,
    });

    const ports: OpenPort[] = [];
    let currentPid = 0;
    let currentName = '';

    for (const line of stdout.trim().split('\n')) {
      if (line.startsWith('p')) {
        currentPid = parseInt(line.substring(1), 10);
      } else if (line.startsWith('c')) {
        currentName = line.substring(1);
      } else if (line.startsWith('n')) {
        // Format: n*:port or n[addr]:port
        const addr = line.substring(1);
        const lastColon = addr.lastIndexOf(':');
        if (lastColon !== -1) {
          const localAddress = addr.substring(0, lastColon);
          const localPort = parseInt(addr.substring(lastColon + 1), 10);
          if (!isNaN(localPort)) {
            ports.push({
              protocol: 'TCP',
              localAddress,
              localPort,
              pid: currentPid,
              processName: currentName,
            });
          }
        }
      }
    }

    return ports.sort((a, b) => a.localPort - b.localPort);
  }

  private async getOpenPortsLinux(): Promise<OpenPort[]> {
    const { stdout } = await execAsync('ss -tlnp', {
      encoding: 'utf8',
      timeout: 10000,
    });

    const ports: OpenPort[] = [];
    const lines = stdout.trim().split('\n').slice(1); // skip header

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) continue;

      // Local Address:Port is at index 3
      const localPart = parts[3];
      const lastColon = localPart.lastIndexOf(':');
      if (lastColon === -1) continue;

      const localAddress = localPart.substring(0, lastColon);
      const localPort = parseInt(localPart.substring(lastColon + 1), 10);

      // Process info in last column: users:(("name",pid=123,fd=4))
      let pid = 0;
      let processName = '';
      const procMatch = parts
        .slice(5)
        .join(' ')
        .match(/\("([^"]+)",pid=(\d+)/);
      if (procMatch) {
        processName = procMatch[1];
        pid = parseInt(procMatch[2], 10);
      }

      if (!isNaN(localPort)) {
        ports.push({
          protocol: 'TCP',
          localAddress,
          localPort,
          pid,
          processName: processName || `PID ${pid}`,
        });
      }
    }

    return ports.sort((a, b) => a.localPort - b.localPort);
  }
}
