/**
 * Help Command
 * Lists all available commands with descriptions
 */

import { CommandParameter, ICommand } from './command-interface.js';
import { CommandRegistry } from './command-registry.js';

export class HelpCommand implements ICommand {
  constructor(private registry: CommandRegistry) {}

  async execute(params: any): Promise<any> {
    const commands = this.registry.getAllCommandsWithDescriptions();
    const commandsWithParams = this.registry.getAllCommandsWithParameters();

    return {
      availableCommands: commands,
      commandParameters: commandsWithParams,
      usage: 'node cli.js <toolname> [params]',
      example1: 'node cli.js ping',
      example2: 'node cli.js echo "Hello World"',
      example3: 'node cli.js calculate \'{"operation":"add","a":5,"b":3}\'',
    };
  }

  getDescription(): string {
    return 'Help command - lists all available commands';
  }

  getParameters(): CommandParameter[] {
    return []; // No parameters needed
  }
}
