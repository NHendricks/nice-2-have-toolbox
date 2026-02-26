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

interface MonitorResponse {
  success: boolean;
  metric?: ResourceMetric;
  updatedAt?: string;
  entries?: ProcessUsage[];
  diskIoMBps?: number | null;
  resources?: ResourceAvailability;
  warning?: string;
  error?: string;
}

export class SystemMonitorCommand implements ICommand {
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
        options: ['top-processes', 'kill-process'],
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

      if (action !== 'top-processes') {
        throw new Error(`Unknown action: ${action}`);
      }

      const diskIoMBps = await this.getGlobalDiskIoMBps();
      const resources = await this.getResourceAvailability();

      if (metric === 'io' && process.platform !== 'win32') {
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

      const entries = await this.getTopProcesses(metric, limit);
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
        await execAsync(`taskkill /PID ${numPid} /F`, { timeout: 5000 });
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
      await new Promise((resolve) => setTimeout(resolve, 250));
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
    const perfDataQuery =
      'Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.IDProcess -gt 0 -and $_.Name -ne "_Total" -and $_.Name -ne "Idle" } | Select-Object IDProcess,Name,PercentProcessorTime,WorkingSetPrivate | ConvertTo-Json -Depth 3';
    const perfRaw = await this.runPowerShellJson(perfDataQuery, 9000);
    const perfList = Array.isArray(perfRaw) ? perfRaw : [perfRaw];

    const commandMap = new Map<number, string>();
    try {
      const commandLineQuery =
        'Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine | ConvertTo-Json -Depth 3';
      const commandRaw = await this.runPowerShellJson(commandLineQuery, 9000);
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

    const ioMap = new Map<number, number>();
    try {
      const ioQuery =
        'Get-Process | Select-Object Id,IOReadBytes,IOWriteBytes | ConvertTo-Json -Depth 3';
      const ioRaw = await this.runPowerShellJson(ioQuery, 9000);
      const ioList = Array.isArray(ioRaw) ? ioRaw : [ioRaw];
      for (const item of ioList) {
        const pid = Number(item?.Id);
        const readBytes = Number(item?.IOReadBytes || 0);
        const writeBytes = Number(item?.IOWriteBytes || 0);
        if (Number.isFinite(pid)) {
          const totalBytes =
            (Number.isFinite(readBytes) ? Math.max(0, readBytes) : 0) +
            (Number.isFinite(writeBytes) ? Math.max(0, writeBytes) : 0);
          ioMap.set(pid, totalBytes / (1024 * 1024));
        }
      }
    } catch {
      // ignore IO enrichment failure
    }

    const entries = perfList
      .map((item: any) => {
        const pid = Number(item?.IDProcess);
        const processName = String(item?.Name || 'unknown');
        const cpu = Number(item?.PercentProcessorTime || 0);
        const memoryMB = Number(item?.WorkingSetPrivate || 0) / (1024 * 1024);

        if (!Number.isFinite(pid)) return null;

        return {
          pid,
          name: processName,
          command: commandMap.get(pid) || processName,
          cpu: Number.isFinite(cpu) ? Math.max(0, cpu) : 0,
          memoryMB: Number.isFinite(memoryMB) ? Math.max(0, memoryMB) : 0,
          ioMB: ioMap.get(pid) || 0,
        } as ProcessUsage;
      })
      .filter((item: ProcessUsage | null): item is ProcessUsage => !!item)
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

  private async runPowerShellJson(
    script: string,
    timeout: number,
  ): Promise<any> {
    const escapedScript = script.replace(/"/g, '\\"');
    const shells = ['powershell', 'pwsh'];
    let lastError: any = null;

    for (const shell of shells) {
      try {
        const { stdout } = await execAsync(
          `${shell} -NoProfile -Command "${escapedScript}"`,
          { timeout, maxBuffer: 10 * 1024 * 1024 },
        );
        const trimmed = (stdout || '').trim();
        if (!trimmed) {
          return [];
        }
        return JSON.parse(trimmed);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Failed to execute PowerShell command');
  }
}
