/**
 * Tests for FileOperationsCommand
 */

import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FileOperationsCommand } from '../commands/file-operations-command.js';

describe('FileOperationsCommand', () => {
  let command: FileOperationsCommand;
  const testDir = path.join(os.tmpdir(), 'file-ops-tests');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    command = new FileOperationsCommand();
  });

  describe('getDescription', () => {
    it('should return command description', () => {
      const description = command.getDescription();
      expect(description).toContain('File operations');
      expect(description).toContain('ZIP');
    });
  });

  describe('getParameters', () => {
    it('should return parameter definitions', () => {
      const params = command.getParameters();
      expect(params.length).toBeGreaterThan(0);
      expect(params[0].name).toBe('operation');
      expect(params[0].type).toBe('select');
    });
  });

  describe('listDrives operation', () => {
    it('should list available drives', async () => {
      const result = await command.execute({ operation: 'drives' });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('drives');
      expect(Array.isArray(result.drives)).toBe(true);
      expect(result.drives.length).toBeGreaterThan(0);
    });
  });

  describe('listFiles operation', () => {
    it('should throw error for missing folderPath', async () => {
      const result = await command.execute({ operation: 'list' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('folderPath is required');
    });

    it('should list files in directory', async () => {
      // Create test directory with files
      const testFolder = path.join(testDir, 'list-test');
      fs.mkdirSync(testFolder, { recursive: true });
      fs.writeFileSync(path.join(testFolder, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(testFolder, 'file2.txt'), 'content2');
      fs.mkdirSync(path.join(testFolder, 'subdir'));

      const result = await command.execute({
        operation: 'list',
        folderPath: testFolder,
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('list');
      expect(result.files.length).toBe(2);
      expect(result.directories.length).toBe(1);
      expect(result.summary.totalFiles).toBe(2);
      expect(result.summary.totalDirectories).toBe(1);

      // Cleanup
      fs.rmSync(testFolder, { recursive: true, force: true });
    });

    it('should throw error for non-existent directory', async () => {
      const result = await command.execute({
        operation: 'list',
        folderPath: path.join(testDir, 'nonexistent'),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should list ZIP file contents', async () => {
      // Create ZIP file
      const zipPath = path.join(testDir, 'test-list.zip');
      const zip = new AdmZip();
      zip.addFile('file1.txt', Buffer.from('content1'));
      zip.addFile('file2.txt', Buffer.from('content2'));
      zip.writeZip(zipPath);

      const result = await command.execute({
        operation: 'list',
        folderPath: zipPath,
      });

      expect(result.success).toBe(true);
      expect(result.isZipPath).toBe(true);
      expect(result.files.length).toBe(2);

      // Cleanup
      fs.unlinkSync(zipPath);
    });
  });

  describe('readFile operation', () => {
    it('should throw error for missing filePath', async () => {
      const result = await command.execute({ operation: 'read' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('filePath is required');
    });

    it('should read text file', async () => {
      const testFile = path.join(testDir, 'read-test.txt');
      const content = 'Hello World!';
      fs.writeFileSync(testFile, content);

      const result = await command.execute({
        operation: 'read',
        filePath: testFile,
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('read');
      expect(result.content).toBe(content);
      expect(result.isImage).toBe(false);

      // Cleanup
      fs.unlinkSync(testFile);
    });

    it('should read image file as base64', async () => {
      const testFile = path.join(testDir, 'test-image.png');
      const imageData = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
      fs.writeFileSync(testFile, imageData);

      const result = await command.execute({
        operation: 'read',
        filePath: testFile,
      });

      expect(result.success).toBe(true);
      expect(result.isImage).toBe(true);
      expect(result.content).toContain('data:image/png;base64,');

      // Cleanup
      fs.unlinkSync(testFile);
    });

    it('should throw error for non-existent file', async () => {
      const result = await command.execute({
        operation: 'read',
        filePath: path.join(testDir, 'nonexistent.txt'),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('copyFile operation', () => {
    it('should throw error for missing sourcePath', async () => {
      const result = await command.execute({
        operation: 'copy',
        destinationPath: 'dest',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('sourcePath is required');
    });

    it('should throw error for missing destinationPath', async () => {
      const result = await command.execute({
        operation: 'copy',
        sourcePath: 'source',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('destinationPath is required');
    });

    it('should copy file', async () => {
      const sourceFile = path.join(testDir, 'copy-source.txt');
      const destFile = path.join(testDir, 'copy-dest.txt');
      fs.writeFileSync(sourceFile, 'Copy me!');

      const result = await command.execute({
        operation: 'copy',
        sourcePath: sourceFile,
        destinationPath: destFile,
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('copy');
      expect(result.type).toBe('file');
      expect(fs.existsSync(destFile)).toBe(true);
      expect(fs.readFileSync(destFile, 'utf-8')).toBe('Copy me!');

      // Cleanup
      fs.unlinkSync(sourceFile);
      fs.unlinkSync(destFile);
    });

    it('should copy directory recursively', async () => {
      const sourceDir = path.join(testDir, 'copy-source-dir');
      const destDir = path.join(testDir, 'copy-dest-dir');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'file.txt'), 'content');
      fs.mkdirSync(path.join(sourceDir, 'subdir'));
      fs.writeFileSync(path.join(sourceDir, 'subdir', 'nested.txt'), 'nested');

      const result = await command.execute({
        operation: 'copy',
        sourcePath: sourceDir,
        destinationPath: destDir,
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('directory');
      expect(fs.existsSync(destDir)).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'file.txt'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'subdir', 'nested.txt'))).toBe(
        true,
      );

      // Cleanup
      fs.rmSync(sourceDir, { recursive: true, force: true });
      fs.rmSync(destDir, { recursive: true, force: true });
    });
  });

  describe('moveFile operation', () => {
    it('should move file', async () => {
      const sourceFile = path.join(testDir, 'move-source.txt');
      const destFile = path.join(testDir, 'move-dest.txt');
      fs.writeFileSync(sourceFile, 'Move me!');

      const result = await command.execute({
        operation: 'move',
        sourcePath: sourceFile,
        destinationPath: destFile,
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('move');
      expect(result.type).toBe('file');
      expect(fs.existsSync(sourceFile)).toBe(false);
      expect(fs.existsSync(destFile)).toBe(true);

      // Cleanup
      fs.unlinkSync(destFile);
    });

    it('should move directory', async () => {
      const sourceDir = path.join(testDir, 'move-source-dir');
      const destDir = path.join(testDir, 'move-dest-dir');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'file.txt'), 'content');

      const result = await command.execute({
        operation: 'move',
        sourcePath: sourceDir,
        destinationPath: destDir,
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('directory');
      expect(fs.existsSync(sourceDir)).toBe(false);
      expect(fs.existsSync(destDir)).toBe(true);

      // Cleanup
      fs.rmSync(destDir, { recursive: true, force: true });
    });
  });

  describe('renameFile operation', () => {
    it('should rename file', async () => {
      const sourceFile = path.join(testDir, 'rename-old.txt');
      const newName = 'rename-new.txt';
      const expectedPath = path.join(testDir, newName);
      fs.writeFileSync(sourceFile, 'Rename me!');

      const result = await command.execute({
        operation: 'rename',
        sourcePath: sourceFile,
        destinationPath: newName,
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('rename');
      expect(result.newName).toBe(newName);
      expect(fs.existsSync(sourceFile)).toBe(false);
      expect(fs.existsSync(expectedPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(expectedPath);
    });

    it('should throw error for missing newName', async () => {
      const result = await command.execute({
        operation: 'rename',
        sourcePath: 'some-file.txt',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('newName is required');
    });
  });

  describe('deleteFile operation', () => {
    it('should delete file', async () => {
      const testFile = path.join(testDir, 'delete-test.txt');
      fs.writeFileSync(testFile, 'Delete me!');

      const result = await command.execute({
        operation: 'delete',
        sourcePath: testFile,
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');
      expect(result.type).toBe('file');
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should delete directory recursively', async () => {
      const testFolder = path.join(testDir, 'delete-test-dir');
      fs.mkdirSync(testFolder, { recursive: true });
      fs.writeFileSync(path.join(testFolder, 'file.txt'), 'content');
      fs.mkdirSync(path.join(testFolder, 'subdir'));

      const result = await command.execute({
        operation: 'delete',
        sourcePath: testFolder,
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('directory');
      expect(fs.existsSync(testFolder)).toBe(false);
    });
  });

  describe('compareDirectories operation', () => {
    it('should compare two directories', async () => {
      const leftDir = path.join(testDir, 'compare-left');
      const rightDir = path.join(testDir, 'compare-right');

      fs.mkdirSync(leftDir, { recursive: true });
      fs.mkdirSync(rightDir, { recursive: true });

      // Same file in both
      fs.writeFileSync(path.join(leftDir, 'same.txt'), 'same content');
      fs.writeFileSync(path.join(rightDir, 'same.txt'), 'same content');

      // Only in left
      fs.writeFileSync(path.join(leftDir, 'left-only.txt'), 'left');

      // Only in right
      fs.writeFileSync(path.join(rightDir, 'right-only.txt'), 'right');

      // Different content
      fs.writeFileSync(path.join(leftDir, 'different.txt'), 'left content');
      fs.writeFileSync(path.join(rightDir, 'different.txt'), 'right content');

      const result = await command.execute({
        operation: 'compare',
        leftPath: leftDir,
        rightPath: rightDir,
        recursive: false,
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('compare');
      expect(result.summary.onlyInLeft).toBe(1);
      expect(result.summary.onlyInRight).toBe(1);
      expect(result.summary.different).toBeGreaterThan(0);

      // Cleanup
      fs.rmSync(leftDir, { recursive: true, force: true });
      fs.rmSync(rightDir, { recursive: true, force: true });
    });

    it('should throw error for missing paths', async () => {
      const result = await command.execute({
        operation: 'compare',
        rightPath: 'some-path',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('leftPath is required');
    });
  });

  describe('zipFiles operation', () => {
    it('should create ZIP file from files', async () => {
      const file1 = path.join(testDir, 'zip-file1.txt');
      const file2 = path.join(testDir, 'zip-file2.txt');
      const zipPath = path.join(testDir, 'test-create.zip');

      fs.writeFileSync(file1, 'content1');
      fs.writeFileSync(file2, 'content2');

      const result = await command.execute({
        operation: 'zip',
        files: [file1, file2],
        zipFilePath: zipPath,
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('zip');
      expect(result.filesAdded).toBe(2);
      expect(fs.existsSync(zipPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(file1);
      fs.unlinkSync(file2);
      fs.unlinkSync(zipPath);
    });

    it('should throw error for missing files', async () => {
      const result = await command.execute({
        operation: 'zip',
        zipFilePath: 'output.zip',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('files array is required');
    });
  });

  describe('executeCommand operation', () => {
    it('should execute command successfully', async () => {
      const result = await command.execute({
        operation: 'execute-command',
        command: process.platform === 'win32' ? 'echo hello' : 'echo hello',
        workingDir: testDir,
      });

      expect(result.operation).toBe('execute-command');
      expect(result.output).toContain('hello');
    });

    it('should throw error for missing command', async () => {
      const result = await command.execute({
        operation: 'execute-command',
        workingDir: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('command is required');
    });
  });

  describe('executeFile operation', () => {
    it('should throw error for missing filePath', async () => {
      const result = await command.execute({
        operation: 'execute-file',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('filePath is required');
    });

    it('should throw error for non-existent file', async () => {
      const result = await command.execute({
        operation: 'execute-file',
        filePath: path.join(testDir, 'nonexistent.txt'),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('unknown operation', () => {
    it('should return error for unknown operation', async () => {
      const result = await command.execute({ operation: 'unknown' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown operation');
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      const result = await command.execute({
        operation: 'copy',
        sourcePath: path.join(testDir, 'nonexistent-source.txt'),
        destinationPath: path.join(testDir, 'dest.txt'),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
