/**
 * Ping Command
 * Simple test command that returns a pong response
 */

import { CommandParameter, ICommand } from './command-interface.js';

export class PingCommand implements ICommand {
  async execute(params: any): Promise<any> {
    return {
      message: 'Pong',
      params: params,
      timestamp: new Date().toISOString(),
    };
  }

  getDescription(): string {
    return 'Simple ping command - returns Pong with timestamp';
  }

  getParameters(): CommandParameter[] {
    return []; // No parameters needed
  }
}
