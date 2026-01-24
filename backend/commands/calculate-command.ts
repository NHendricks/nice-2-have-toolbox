/**
 * Calculate Command
 * Performs simple calculations
 */

import { ICommand } from './command-interface.js';

export class CalculateCommand implements ICommand {
  async execute(params: any): Promise<any> {
    // Expect params as object: { operation: 'add', a: 5, b: 3 }
    if (typeof params === 'string') {
      try {
        params = JSON.parse(params);
      } catch {
        throw new Error('Invalid JSON format for calculate command');
      }
    }

    if (!params || typeof params !== 'object') {
      throw new Error(
        'Calculate requires params as object: { operation: "add|subtract|multiply|divide", a: number, b: number }',
      );
    }

    const { operation, a, b } = params;

    // Convert to numbers if they come as strings from UI
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;

    if (isNaN(numA) || isNaN(numB)) {
      throw new Error('Parameters a and b must be valid numbers');
    }

    let result: number;

    switch (operation) {
      case 'add':
        result = numA + numB;
        break;
      case 'subtract':
        result = numA - numB;
        break;
      case 'multiply':
        result = numA * numB;
        break;
      case 'divide':
        if (numB === 0) {
          throw new Error('Division by zero');
        }
        result = numA / numB;
        break;
      default:
        throw new Error(
          `Unknown operation: ${operation}. Valid: add, subtract, multiply, divide`,
        );
    }

    return {
      operation,
      a,
      b,
      result,
    };
  }

  getDescription(): string {
    return 'Calculate command - performs basic arithmetic operations (add, subtract, multiply, divide)';
  }

  getParameters(): any[] {
    return [
      {
        name: 'operation',
        type: 'select',
        description: 'Mathematical operation to perform',
        required: true,
        options: ['add', 'subtract', 'multiply', 'divide'],
        default: 'add',
      },
      {
        name: 'a',
        type: 'number',
        description: 'First number',
        required: true,
        default: 5,
      },
      {
        name: 'b',
        type: 'number',
        description: 'Second number',
        required: true,
        default: 3,
      },
    ];
  }
}
