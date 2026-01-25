/**
 * Test File Operations Command
 */

import { CommandHandler } from './dist/command-handler.js';

async function testFileOperations() {
  console.log('='.repeat(60));
  console.log('Testing File Operations Command');
  console.log('='.repeat(60));
  console.log('');

  const handler = new CommandHandler();

  // Test 1: List files in /Users/Nils
  console.log('Test 1: List files in /Users/Nils');
  console.log('-'.repeat(60));
  try {
    const result = await handler.execute('file-operations', {
      operation: 'list',
      folderPath: '/Users/Nils',
    });

    console.log('Success:', result.success);
    console.log('Path:', result.path);
    console.log('Total items:', result.totalItems);
    console.log('Directories:', result.summary?.totalDirectories);
    console.log('Files:', result.summary?.totalFiles);

    // Show first few items
    if (result.directories && result.directories.length > 0) {
      console.log('\nFirst directory:');
      console.log(JSON.stringify(result.directories[0], null, 2));
    }

    if (result.files && result.files.length > 0) {
      console.log('\nFirst file:');
      console.log(JSON.stringify(result.files[0], null, 2));
    }

    // Try to serialize as JSON to test for serialization issues
    console.log('\nTesting JSON serialization...');
    const serialized = JSON.stringify(result);
    console.log('✅ JSON serialization successful!');
    console.log('Serialized length:', serialized.length);

    // Try to parse it back
    const parsed = JSON.parse(serialized);
    console.log('✅ JSON parsing successful!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(60));

  // Test 2: List files in /Users
  console.log('\nTest 2: List files in /Users');
  console.log('-'.repeat(60));
  try {
    const result = await handler.execute('file-operations', {
      operation: 'list',
      folderPath: '/Users',
    });

    console.log('Success:', result.success);
    console.log('Path:', result.path);
    console.log(
      'Items:',
      result.directories?.length || 0,
      'directories,',
      result.files?.length || 0,
      'files',
    );

    // Test serialization
    const serialized = JSON.stringify(result);
    console.log('✅ JSON serialization successful for /Users');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
}

testFileOperations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
