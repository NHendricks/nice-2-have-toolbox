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
      error: 'Usage: node cli.js <toolname> [params]',
      toolname: 'none',
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(response, null, 2));
    process.exit(1);
  }

  const toolname = args[0];
  const params = args.slice(1).join(' ');

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

    console.log(JSON.stringify(response, null, 2));
    process.exit(0);
  } catch (error: any) {
    const response: CliResponse = {
      success: false,
      error: error.message || 'Unknown error',
      toolname: toolname,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(response, null, 2));
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
