/**
 * Command Interface
 * All commands must implement this interface
 */

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description: string;
  required: boolean;
  options?: string[]; // For select type
  default?: any;
}

export interface ICommand {
  /**
   * Execute the command with given parameters
   * @param params - Command parameters (can be any type)
   * @returns Promise with command result
   */
  execute(params: any): Promise<any>;

  /**
   * Get command description
   */
  getDescription(): string;

  /**
   * Get parameter definitions for this command
   */
  getParameters(): CommandParameter[];
}
