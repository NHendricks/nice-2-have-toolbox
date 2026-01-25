#!/usr/bin/env node
/**
 * Backend CLI Application
 * Usage: node cli.js <toolname> <params>
 * Returns: JSON response
 */

import { CommandHandler } from './command-handler.js';

interface CliResponse {
  success: boolean;
  data?: any;
  error?: string;
  toolname: string;
  timestamp: string;
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Check if we have at least a toolname
  if (args.length < 1) {
    const response: CliResponse = {
      success: false,
      error: 'Usage: node cli.js <toolname> [params] [--json]',
      toolname: 'none',
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(response, null, 2));
    process.exit(1);
  }

  // Check for --json flag
  const jsonFlag = args.includes('--json');
  const filteredArgs = args.filter((arg) => arg !== '--json');

  const toolname = filteredArgs[0];
  const params = filteredArgs.slice(1).join(' ');

  try {
    // Parse params as JSON if it looks like JSON, otherwise treat as string
    let parsedParams: any = params;
    if (params && (params.startsWith('{') || params.startsWith('['))) {
      try {
        parsedParams = JSON.parse(params);
      } catch {
        // If JSON parsing fails, keep as string
      }
    }

    // Execute command via handler
    const handler = new CommandHandler();
    const result = await handler.execute(toolname, parsedParams);

    const response: CliResponse = {
      success: true,
      data: result,
      toolname: toolname,
      timestamp: new Date().toISOString(),
    };

    // Output based on --json flag
    if (jsonFlag) {
      // Full JSON response with metadata (compact to avoid buffer issues)
      // Use callback to ensure stdout is flushed before exit
      process.stdout.write(JSON.stringify(response) + '\n', () => {
        process.exit(0);
      });
    } else {
      // Only the result field from the data
      if (result && typeof result === 'object' && 'result' in result) {
        // Output the result field
        if (typeof result.result === 'object') {
          console.log(JSON.stringify(result.result, null, 2));
        } else {
          console.log(result.result);
        }
      } else if (typeof result === 'object') {
        // Fallback: output entire result if no result field exists
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result);
      }
      process.exit(0);
    }
  } catch (error: any) {
    const response: CliResponse = {
      success: false,
      error: error.message || 'Unknown error',
      toolname: toolname,
      timestamp: new Date().toISOString(),
    };

    // Output based on --json flag
    if (jsonFlag) {
      // Full JSON response with metadata
      console.log(JSON.stringify(response, null, 2));
    } else {
      // Only the error message
      console.error(`Error: ${error.message || 'Unknown error'}`);
    }
    process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error(
    JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }),
  );
  process.exit(1);
});
