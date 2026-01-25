/**
 * Test IPC call simulation - exactly as the UI does it
 */

const { spawn } = require('child_process');
const path = require('path');

async function testIpcCall(folderPath) {
  return new Promise((resolve) => {
    const cliPath = path.join(__dirname, 'backend/dist/cli.js');
    const params = JSON.stringify({
      operation: 'list',
      folderPath: folderPath,
    });

    const args = [cliPath, 'file-operations', params, '--json'];

    console.log('Command:', 'node', args.join(' '));
    console.log('');

    const child = spawn('node', args);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', () => {
      console.log('STDOUT length:', stdout.length);
      console.log('STDERR:', stderr || '(none)');
      console.log('');

      try {
        const result = JSON.parse(stdout);
        console.log('✅ JSON parsing successful!');
        console.log('Success:', result.success);
        if (result.data) {
          console.log('Path:', result.data.path);
          console.log('Items:', result.data.totalItems);
          console.log('Directories:', result.data.summary?.totalDirectories);
          console.log('Files:', result.data.summary?.totalFiles);
        }
        if (result.error) {
          console.log('Error:', result.error);
        }
        resolve(result);
      } catch (error) {
        console.error('❌ JSON parsing failed!');
        console.error('Parse error:', error.message);
        console.log('');
        console.log('First 500 chars of stdout:');
        console.log(stdout.substring(0, 500));
        console.log('');
        console.log('Last 500 chars of stdout:');
        console.log(stdout.substring(Math.max(0, stdout.length - 500)));
        resolve({
          success: false,
          error: stderr || 'Failed to parse response',
        });
      }
    });
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Testing IPC-style calls');
  console.log('='.repeat(60));
  console.log('');

  console.log('Test 1: /Users');
  console.log('-'.repeat(60));
  await testIpcCall('/Users');

  console.log('');
  console.log('');
  console.log('Test 2: /Users/Nils');
  console.log('-'.repeat(60));
  await testIpcCall('/Users/Nils');

  console.log('');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
