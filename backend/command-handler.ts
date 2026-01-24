/**
 * Command Handler
 * Central registry for all CLI commands/tools
 */

import { CommandRegistry } from './commands/command-registry.js';

export class CommandHandler {
  private registry: CommandRegistry;

  constructor() {
    this.registry = new CommandRegistry();
  }

  /**
   * Execute a command by toolname with given params
   * @param toolname - The name of the tool/command to execute
   * @param params - Parameters for the command (can be string, object, array)
   * @returns Command execution result
   */
  async execute(toolname: string, params: any): Promise<any> {
    const command = this.registry.getCommand(toolname);

    if (!command) {
      throw new Error(`Unknown command: ${toolname}`);
    }

    // Execute command and return result
    return await command.execute(params);
  }

  /**
   * Get list of all available commands
   */
  listCommands(): string[] {
    return this.registry.listCommands();
  }
}
