/**
 * System Monitor Command
 * Returns top resource-consuming processes for CPU or memory.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface.js';

const execAsync = promisify(exec);

type ResourceMetric = 'cpu' | 'memory';

interface ProcessUsage {
  pid: number;
  name: string;
  command: string;
  cpu: number;
  memoryMB: number;
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
        options: ['top-processes'],
        default: 'top-processes',
      },
      {
        name: 'metric',
        type: 'select',
        description: 'Sort metric',
        required: false,
        options: ['cpu', 'memory'],
        default: 'cpu',
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum process count',
        required: false,
        default: 8,
      },
    ];
  }

  async execute(params: any): Promise<any> {
    const action = params?.action || 'top-processes';
    const metric: ResourceMetric =
      params?.metric === 'memory' ? 'memory' : 'cpu';
    const parsedLimit = Number(params?.limit);
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(3, Math.min(20, Math.floor(parsedLimit)))
      : 8;

    try {
      if (action !== 'top-processes') {
        throw new Error(`Unknown action: ${action}`);
      }

      const entries = await this.getTopProcesses(metric, limit);
      return {
        success: true,
        metric,
        updatedAt: new Date().toISOString(),
        entries,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
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
        } as ProcessUsage;
      })
      .filter((item): item is ProcessUsage => !!item)
      .sort((a, b) =>
        metric === 'cpu' ? b.cpu - a.cpu : b.memoryMB - a.memoryMB,
      )
      .slice(0, limit);

    return entries;
  }

  private async getTopProcessesWindows(
    metric: ResourceMetric,
    limit: number,
  ): Promise<ProcessUsage[]> {
    const psCommand =
      'Get-Process | Select-Object Id,ProcessName,CPU,WorkingSet64 | ConvertTo-Json -Depth 2';
    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "${psCommand}"`,
      { timeout: 7000 },
    );

    const raw = JSON.parse(stdout);
    const list = Array.isArray(raw) ? raw : [raw];

    const commandMap = new Map<number, string>();
    try {
      const commandLineQuery =
        'Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine | ConvertTo-Json -Depth 3';
      const commandResponse = await execAsync(
        `powershell -NoProfile -Command "${commandLineQuery}"`,
        { timeout: 9000 },
      );
      const commandRaw = JSON.parse(commandResponse.stdout || '[]');
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

    const entries = list
      .map((item: any) => {
        const pid = Number(item?.Id);
        const processName = String(item?.ProcessName || 'unknown');
        const cpu = Number(item?.CPU || 0);
        const memoryMB = Number(item?.WorkingSet64 || 0) / (1024 * 1024);

        if (!Number.isFinite(pid)) return null;

        return {
          pid,
          name: processName,
          command: commandMap.get(pid) || processName,
          cpu: Number.isFinite(cpu) ? Math.max(0, cpu) : 0,
          memoryMB: Number.isFinite(memoryMB) ? Math.max(0, memoryMB) : 0,
        } as ProcessUsage;
      })
      .filter((item: ProcessUsage | null): item is ProcessUsage => !!item)
      .sort((a, b) =>
        metric === 'cpu' ? b.cpu - a.cpu : b.memoryMB - a.memoryMB,
      )
      .slice(0, limit);

    return entries;
  }
}
