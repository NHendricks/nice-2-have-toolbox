/**
 * Test Script for Backend CLI
 * Run with: node test.js
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cliPath = join(__dirname, 'dist', 'cli.js');

/**
 * Execute a CLI command and return the result
 */
function executeCommand(toolname, params = '') {
  return new Promise((resolve, reject) => {
    const args = params ? [cliPath, toolname, params] : [cliPath, toolname];
    const child = spawn('node', args);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (stderr) {
        console.error('STDERR:', stderr);
      }
      resolve({ stdout, stderr, code });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('Backend CLI Test Suite');
  console.log('='.repeat(60));
  console.log('');

  const tests = [
    {
      name: 'Test 1: Help Command',
      toolname: 'help',
      params: '',
    },
    {
      name: 'Test 2: Ping Command',
      toolname: 'ping',
      params: '',
    },
    {
      name: 'Test 3: Echo Command',
      toolname: 'echo',
      params: 'Hello World',
    },
    {
      name: 'Test 4: Calculate Add',
      toolname: 'calculate',
      params: '{"operation":"add","a":10,"b":5}',
    },
    {
      name: 'Test 5: Calculate Multiply',
      toolname: 'calculate',
      params: '{"operation":"multiply","a":7,"b":6}',
    },
    {
      name: 'Test 6: Invalid Command',
      toolname: 'nonexistent',
      params: '',
    },
  ];

  for (const test of tests) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${test.name}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`Command: node cli.js ${test.toolname} ${test.params}`);
    console.log('');

    try {
      const result = await executeCommand(test.toolname, test.params);

      if (result.stdout) {
        console.log('✅ Result:');
        const jsonResult = JSON.parse(result.stdout);
        console.log(JSON.stringify(jsonResult, null, 2));
      }

      if (result.code === 0) {
        console.log('\n✓ Status: SUCCESS');
      } else {
        console.log('\n⚠ Status: FAILED (expected for invalid commands)');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
