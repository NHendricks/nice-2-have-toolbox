/**
 * Tests for ZipHelper
 */

import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ZipHelper } from '../commands/zip-helper.js';

describe('ZipHelper', () => {
  const testDir = path.join(os.tmpdir(), 'zip-helper-tests');
  const testZipPath = path.join(testDir, 'test.zip');

  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean up any existing test files before each test
    if (fs.existsSync(testZipPath)) {
      fs.unlinkSync(testZipPath);
    }
  });

  afterEach(() => {
    // Clean up test files after each test
    if (fs.existsSync(testZipPath)) {
      fs.unlinkSync(testZipPath);
    }
  });

  describe('parsePath', () => {
    it('should parse simple zip path', () => {
      const result = ZipHelper.parsePath('D:\\archive.zip/folder/file.txt');

      expect(result.isZipPath).toBe(true);
      expect(result.zipFile).toBe(`D:${path.sep}archive.zip`);
      expect(result.internalPath).toBe('folder/file.txt');
    });

    it('should parse zip path with forward slashes', () => {
      const result = ZipHelper.parsePath('D:/archive.zip/folder/file.txt');

      expect(result.isZipPath).toBe(true);
      expect(result.zipFile).toBe(`D:${path.sep}archive.zip`);
      expect(result.internalPath).toBe('folder/file.txt');
    });

    it('should not parse path without internal path as zip path', () => {
      const result = ZipHelper.parsePath('D:\\archive.zip');

      expect(result.isZipPath).toBe(false);
      expect(result.zipFile).toBe('');
      expect(result.internalPath).toBe('');
    });

    it('should not parse non-zip path', () => {
      const result = ZipHelper.parsePath('D:\\folder\\file.txt');

      expect(result.isZipPath).toBe(false);
    });

    it('should handle zip path at root', () => {
      const result = ZipHelper.parsePath('C:\\test.zip/file.txt');

      expect(result.isZipPath).toBe(true);
      expect(result.zipFile).toBe(`C:${path.sep}test.zip`);
      expect(result.internalPath).toBe('file.txt');
    });

    it('should handle nested zip directories', () => {
      const result = ZipHelper.parsePath(
        'D:\\archives\\data.zip/folder/subfolder/file.txt',
      );

      expect(result.isZipPath).toBe(true);
      expect(result.zipFile).toBe(`D:${path.sep}archives${path.sep}data.zip`);
      expect(result.internalPath).toBe('folder/subfolder/file.txt');
    });
  });

  describe('isZipFile', () => {
    it('should return true for existing zip files', () => {
      const testZipPath = path.join(process.cwd(), 'test.zip');

      // Create a temporary zip file for testing
      if (!fs.existsSync(testZipPath)) {
        fs.writeFileSync(testZipPath, '');
      }

      const result = ZipHelper.isZipFile(testZipPath);

      expect(result).toBe(true);

      // Cleanup
      if (fs.existsSync(testZipPath)) {
        fs.unlinkSync(testZipPath);
      }
    });

    it('should return false for non-existing files', () => {
      const result = ZipHelper.isZipFile('nonexistent.zip');

      expect(result).toBe(false);
    });

    it('should return false for non-zip files', () => {
      const testFilePath = path.join(process.cwd(), 'test.txt');

      fs.writeFileSync(testFilePath, 'test');
      const result = ZipHelper.isZipFile(testFilePath);

      expect(result).toBe(false);

      // Cleanup
      fs.unlinkSync(testFilePath);
    });

    it('should handle case-insensitive zip extension', () => {
      const testZipPath = path.join(process.cwd(), 'test.ZIP');

      fs.writeFileSync(testZipPath, '');
      const result = ZipHelper.isZipFile(testZipPath);

      expect(result).toBe(true);

      // Cleanup
      fs.unlinkSync(testZipPath);
    });
  });

  describe('listZipContents', () => {
    it('should throw error for non-existing zip file', () => {
      expect(() => {
        ZipHelper.listZipContents('nonexistent.zip');
      }).toThrow('ZIP file does not exist');
    });

    it('should list files in root of ZIP', () => {
      // Create ZIP with files
      const zip = new AdmZip();
      zip.addFile('file1.txt', Buffer.from('content1'));
      zip.addFile('file2.txt', Buffer.from('content2'));
      zip.writeZip(testZipPath);

      const result = ZipHelper.listZipContents(testZipPath);

      expect(result.success).toBe(true);
      expect(result.isZipPath).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.files[0].name).toBe('file1.txt');
      expect(result.files[1].name).toBe('file2.txt');
    });

    it('should list files and directories in ZIP', () => {
      // Create ZIP with nested structure
      const zip = new AdmZip();
      zip.addFile('root.txt', Buffer.from('root content'));
      zip.addFile('folder1/file1.txt', Buffer.from('content1'));
      zip.addFile('folder1/file2.txt', Buffer.from('content2'));
      zip.addFile('folder2/nested/file3.txt', Buffer.from('content3'));
      zip.writeZip(testZipPath);

      const result = ZipHelper.listZipContents(testZipPath);

      expect(result.success).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.directories.length).toBeGreaterThan(0);
    });

    it('should list contents of folder within ZIP', () => {
      // Create ZIP with nested folders
      const zip = new AdmZip();
      zip.addFile('folder1/file1.txt', Buffer.from('content1'));
      zip.addFile('folder1/file2.txt', Buffer.from('content2'));
      zip.addFile('folder1/subfolder/file3.txt', Buffer.from('content3'));
      zip.writeZip(testZipPath);

      const result = ZipHelper.listZipContents(testZipPath, 'folder1');

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.directories.length).toBeGreaterThan(0);
    });
  });

  describe('readFromZip', () => {
    it('should throw error for non-existing zip file', () => {
      expect(() => {
        ZipHelper.readFromZip('nonexistent.zip', 'file.txt');
      }).toThrow('ZIP file does not exist');
    });

    it('should read text file from ZIP', () => {
      // Create ZIP with text file
      const zip = new AdmZip();
      const content = 'Hello from ZIP file';
      zip.addFile('test.txt', Buffer.from(content));
      zip.writeZip(testZipPath);

      const result = ZipHelper.readFromZip(testZipPath, 'test.txt', false);

      expect(result).toBe(content);
    });

    it('should read binary file from ZIP', () => {
      // Create ZIP with binary content
      const zip = new AdmZip();
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      zip.addFile('binary.bin', binaryContent);
      zip.writeZip(testZipPath);

      const result = ZipHelper.readFromZip(testZipPath, 'binary.bin', true);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(binaryContent);
    });

    it('should throw error for non-existing file in ZIP', () => {
      // Create empty ZIP
      const zip = new AdmZip();
      zip.addFile('exists.txt', Buffer.from('content'));
      zip.writeZip(testZipPath);

      expect(() => {
        ZipHelper.readFromZip(testZipPath, 'nonexistent.txt');
      }).toThrow('File not found in ZIP');
    });

    it('should read file from nested folder in ZIP', () => {
      // Create ZIP with nested file
      const zip = new AdmZip();
      const content = 'Nested content';
      zip.addFile('folder/subfolder/nested.txt', Buffer.from(content));
      zip.writeZip(testZipPath);

      const result = ZipHelper.readFromZip(
        testZipPath,
        'folder/subfolder/nested.txt',
        false,
      );

      expect(result).toBe(content);
    });
  });

  describe('extractFromZip', () => {
    it('should throw error for non-existing zip file', () => {
      expect(() => {
        ZipHelper.extractFromZip('nonexistent.zip', 'file.txt', 'dest.txt');
      }).toThrow('ZIP file does not exist');
    });

    it('should extract file from ZIP', () => {
      // Create ZIP with file
      const zip = new AdmZip();
      const content = 'Extract me';
      zip.addFile('extract.txt', Buffer.from(content));
      zip.writeZip(testZipPath);

      const destPath = path.join(testDir, 'extracted.txt');
      ZipHelper.extractFromZip(testZipPath, 'extract.txt', destPath);

      expect(fs.existsSync(destPath)).toBe(true);
      const extractedContent = fs.readFileSync(destPath, 'utf-8');
      expect(extractedContent).toBe(content);

      // Cleanup
      fs.unlinkSync(destPath);
    });

    it('should extract directory from ZIP', () => {
      // Create ZIP with directory structure
      const zip = new AdmZip();
      zip.addFile('mydir/file1.txt', Buffer.from('content1'));
      zip.addFile('mydir/file2.txt', Buffer.from('content2'));
      zip.addFile('mydir/sub/file3.txt', Buffer.from('content3'));
      zip.writeZip(testZipPath);

      const destPath = path.join(testDir, 'extracted-dir');
      ZipHelper.extractFromZip(testZipPath, 'mydir', destPath);

      expect(fs.existsSync(destPath)).toBe(true);
      expect(fs.existsSync(path.join(destPath, 'file1.txt'))).toBe(true);
      expect(fs.existsSync(path.join(destPath, 'file2.txt'))).toBe(true);

      // Cleanup
      fs.rmSync(destPath, { recursive: true, force: true });
    });
  });

  describe('addToZip', () => {
    it('should create new ZIP and add file', () => {
      // Create a test file
      const sourceFile = path.join(testDir, 'source.txt');
      fs.writeFileSync(sourceFile, 'Source content');

      ZipHelper.addToZip(testZipPath, sourceFile, 'added.txt');

      expect(fs.existsSync(testZipPath)).toBe(true);

      // Verify file was added
      const zip = new AdmZip(testZipPath);
      const entry = zip.getEntry('added.txt');
      expect(entry).not.toBeNull();

      // Cleanup
      fs.unlinkSync(sourceFile);
    });

    it('should add file to existing ZIP', () => {
      // Create existing ZIP
      const zip = new AdmZip();
      zip.addFile('existing.txt', Buffer.from('existing'));
      zip.writeZip(testZipPath);

      // Add new file
      const sourceFile = path.join(testDir, 'new.txt');
      fs.writeFileSync(sourceFile, 'New content');
      ZipHelper.addToZip(testZipPath, sourceFile, 'new.txt');

      // Verify both files exist
      const updatedZip = new AdmZip(testZipPath);
      expect(updatedZip.getEntry('existing.txt')).not.toBeNull();
      expect(updatedZip.getEntry('new.txt')).not.toBeNull();

      // Cleanup
      fs.unlinkSync(sourceFile);
    });

    it('should add directory to ZIP', () => {
      // Create a test directory with files
      const sourceDir = path.join(testDir, 'source-dir');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(sourceDir, 'file2.txt'), 'content2');

      ZipHelper.addToZip(testZipPath, sourceDir, 'mydir');

      expect(fs.existsSync(testZipPath)).toBe(true);

      // Verify directory was added
      const zip = new AdmZip(testZipPath);
      const entries = zip.getEntries();
      expect(entries.length).toBeGreaterThan(0);

      // Cleanup
      fs.rmSync(sourceDir, { recursive: true, force: true });
    });
  });

  describe('deleteFromZip', () => {
    it('should throw error for non-existing zip file', () => {
      expect(() => {
        ZipHelper.deleteFromZip('nonexistent.zip', 'file.txt');
      }).toThrow('ZIP file does not exist');
    });

    it('should delete file from ZIP', () => {
      // Create ZIP with files
      const zip = new AdmZip();
      zip.addFile('keep.txt', Buffer.from('keep'));
      zip.addFile('delete.txt', Buffer.from('delete'));
      zip.writeZip(testZipPath);

      ZipHelper.deleteFromZip(testZipPath, 'delete.txt');

      // Verify file was deleted
      const updatedZip = new AdmZip(testZipPath);
      expect(updatedZip.getEntry('keep.txt')).not.toBeNull();
      expect(updatedZip.getEntry('delete.txt')).toBeNull();
    });

    it('should delete directory from ZIP', () => {
      // Create ZIP with directory
      const zip = new AdmZip();
      zip.addFile('root.txt', Buffer.from('root'));
      zip.addFile('dir/file1.txt', Buffer.from('content1'));
      zip.addFile('dir/file2.txt', Buffer.from('content2'));
      zip.addFile('dir/sub/file3.txt', Buffer.from('content3'));
      zip.writeZip(testZipPath);

      ZipHelper.deleteFromZip(testZipPath, 'dir');

      // Verify directory was deleted
      const updatedZip = new AdmZip(testZipPath);
      expect(updatedZip.getEntry('root.txt')).not.toBeNull();
      expect(updatedZip.getEntry('dir/file1.txt')).toBeNull();
      expect(updatedZip.getEntry('dir/file2.txt')).toBeNull();
      expect(updatedZip.getEntry('dir/sub/file3.txt')).toBeNull();
    });
  });
});
