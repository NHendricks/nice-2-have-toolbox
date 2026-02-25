/**
 * Command Registry
 * Central registry for all available commands
 */

import { CalculateCommand } from './calculate-command.js';
import { ICommand } from './command-interface.js';
import { ConfigCommand } from './config-command.js';
import { FileOperationsCommand } from './file-operations-command.js';
import { FTPCommand } from './ftp-command.js';
import { GarbageFinderCommand } from './garbage-finder-command.js';
import { HelpCommand } from './help-command.js';
import { PingCommand } from './ping-command.js';
import { ProficashCommand } from './proficash-command.js';
import { ResticCommand } from './restic-command.js';
import { ScannerCommand } from './scanner-command.js';
import { PdfSplitCommand } from './pdf-split-command.js';
import { SystemMonitorCommand } from './system-monitor-command.js';

export class CommandRegistry {
  private commands: Map<string, ICommand>;

  constructor() {
    this.commands = new Map();
    this.registerDefaultCommands();
  }

  /**
   * Register all default commands
   */
  private registerDefaultCommands(): void {
    this.register('ping', new PingCommand());
    this.register('calculate', new CalculateCommand());
    this.register('help', new HelpCommand(this));
    this.register('file-operations', new FileOperationsCommand());
    this.register('ftp', new FTPCommand());
    this.register('proficash', new ProficashCommand());
    this.register('garbage-finder', new GarbageFinderCommand());
    this.register('restic', new ResticCommand());
    this.register('scanner', new ScannerCommand());
    this.register('system-monitor', new SystemMonitorCommand());
    this.register('pdf-split', new PdfSplitCommand());
    this.register('config', new ConfigCommand());
  }

  /**
   * Register a new command
   * @param name - Command name
   * @param command - Command implementation
   */
  register(name: string, command: ICommand): void {
    this.commands.set(name.toLowerCase(), command);
  }

  /**
   * Get a command by name
   * @param name - Command name
   * @returns Command instance or undefined
   */
  getCommand(name: string): ICommand | undefined {
    return this.commands.get(name.toLowerCase());
  }

  /**
   * List all available commands
   * @returns Array of command names
   */
  listCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Get all commands with descriptions
   * @returns Object with command names and descriptions
   */
  getAllCommandsWithDescriptions(): Record<string, string> {
    const result: Record<string, string> = {};
    this.commands.forEach((command, name) => {
      result[name] = command.getDescription();
    });
    return result;
  }

  /**
   * Get all commands with their parameters
   * @returns Object with command names and their parameter definitions
   */
  getAllCommandsWithParameters(): Record<string, any> {
    const result: Record<string, any> = {};
    this.commands.forEach((command, name) => {
      result[name] = {
        description: command.getDescription(),
        parameters: command.getParameters(),
      };
    });
    return result;
  }
}
