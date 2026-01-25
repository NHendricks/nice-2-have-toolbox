/**
 * ZIP Helper
 * Helper functions for ZIP file operations
 */

import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';

export interface ZipPath {
  zipFile: string;
  internalPath: string;
  isZipPath: boolean;
}

export class ZipHelper {
  /**
   * Parse a path that might contain a ZIP file reference
   * e.g., "D:\archive.zip/folder/file.txt" -> { zipFile: "D:\archive.zip", internalPath: "folder/file.txt" }
   */
  static parsePath(fullPath: string): ZipPath {
    // Normalize to forward slashes for easier parsing
    const normalized = fullPath.replace(/\\/g, '/');

    // Look for .zip in the path
    const zipMatch = normalized.match(/^(.+\.zip)(\/(.*))?$/i);

    if (zipMatch) {
      return {
        zipFile: zipMatch[1].replace(/\//g, path.sep),
        internalPath: zipMatch[3] || '',
        isZipPath: true,
      };
    }

    return {
      zipFile: '',
      internalPath: '',
      isZipPath: false,
    };
  }

  /**
   * Check if a path points to a ZIP file
   */
  static isZipFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.zip') && fs.existsSync(filePath);
  }

  /**
   * List contents of a ZIP file or folder within ZIP
   */
  static listZipContents(zipFilePath: string, internalPath: string = ''): any {
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`ZIP file does not exist: ${zipFilePath}`);
    }

    const zip = new AdmZip(zipFilePath);
    const entries = zip.getEntries();

    const files: any[] = [];
    const directories: any[] = [];
    const seenDirs = new Set<string>();

    // Normalize internal path
    const normalizedInternal = internalPath
      ? internalPath.replace(/\\/g, '/').replace(/\/$/, '')
      : '';
    const prefix = normalizedInternal ? normalizedInternal + '/' : '';

    for (const entry of entries) {
      const entryPath = entry.entryName.replace(/\\/g, '/');

      // Skip if not in current folder
      if (normalizedInternal && !entryPath.startsWith(prefix)) {
        continue;
      }

      // Get relative path from current folder
      const relativePath = normalizedInternal
        ? entryPath.substring(prefix.length)
        : entryPath;

      // Skip if empty (we're at the current folder itself)
      if (!relativePath) {
        continue;
      }

      // Check if it's a direct child
      const parts = relativePath.split('/').filter((p) => p);
      if (parts.length === 0) continue;

      const name = parts[0];
      const isDirectChild = parts.length === 1;
      const fullInternalPath = normalizedInternal
        ? `${normalizedInternal}/${name}`
        : name;

      if (isDirectChild && !entry.isDirectory) {
        // Direct file
        files.push({
          name: name,
          path: `${zipFilePath}/${fullInternalPath}`,
          size: entry.header.size,
          created: entry.header.time.toISOString(),
          modified: entry.header.time.toISOString(),
          isDirectory: false,
          isFile: true,
          isZipEntry: true,
        });
      } else if (!seenDirs.has(name)) {
        // Directory (either direct subdirectory or implied by deeper files)
        seenDirs.add(name);
        directories.push({
          name: name,
          path: `${zipFilePath}/${fullInternalPath}`,
          size: 0,
          created: entry.header.time.toISOString(),
          modified: entry.header.time.toISOString(),
          isDirectory: true,
          isFile: false,
          isZipEntry: true,
        });
      }
    }

    return {
      success: true,
      operation: 'list',
      path: internalPath ? `${zipFilePath}/${normalizedInternal}` : zipFilePath,
      directories: directories,
      files: files,
      summary: {
        totalFiles: files.length,
        totalDirectories: directories.length,
      },
      isZipPath: true,
    };
  }

  /**
   * Read a file from within a ZIP
   */
  static readFromZip(
    zipFilePath: string,
    internalPath: string,
    asBinary: boolean = false,
  ): Buffer | string {
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`ZIP file does not exist: ${zipFilePath}`);
    }

    const zip = new AdmZip(zipFilePath);
    const normalizedPath = internalPath.replace(/\\/g, '/');
    const entry = zip.getEntry(normalizedPath);

    if (!entry) {
      throw new Error(`File not found in ZIP: ${internalPath}`);
    }

    if (asBinary) {
      const buffer = zip.readFile(entry);
      if (!buffer) {
        throw new Error(`Failed to read file from ZIP: ${internalPath}`);
      }
      return buffer;
    } else {
      return zip.readAsText(entry, 'utf-8');
    }
  }

  /**
   * Extract a file or directory from ZIP to a destination
   */
  static extractFromZip(
    zipFilePath: string,
    internalPath: string,
    destinationPath: string,
  ): void {
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`ZIP file does not exist: ${zipFilePath}`);
    }

    const zip = new AdmZip(zipFilePath);
    const normalizedPath = internalPath.replace(/\\/g, '/');

    // Check if it's a directory by looking at all entries
    const entries = zip.getEntries();
    const isDirectory = entries.some(
      (entry) =>
        entry.entryName.replace(/\\/g, '/').startsWith(normalizedPath + '/') ||
        entry.entryName.replace(/\\/g, '/') === normalizedPath + '/',
    );

    if (isDirectory) {
      // Extract all entries that start with this path
      const prefix = normalizedPath.endsWith('/')
        ? normalizedPath
        : normalizedPath + '/';

      for (const entry of entries) {
        const entryPath = entry.entryName.replace(/\\/g, '/');
        if (entryPath.startsWith(prefix)) {
          const relativePath = entryPath.substring(prefix.length);
          const targetPath = path.join(
            destinationPath,
            relativePath.replace(/\//g, path.sep),
          );

          if (entry.isDirectory) {
            // Create directory
            if (!fs.existsSync(targetPath)) {
              fs.mkdirSync(targetPath, { recursive: true });
            }
          } else {
            // Extract file
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            zip.extractEntryTo(entry, targetDir, false, true);

            // Rename if needed
            const extractedFile = path.join(
              targetDir,
              path.basename(entry.entryName),
            );
            if (extractedFile !== targetPath && fs.existsSync(extractedFile)) {
              fs.renameSync(extractedFile, targetPath);
            }
          }
        }
      }
    } else {
      // Extract single file
      zip.extractEntryTo(
        normalizedPath,
        path.dirname(destinationPath),
        false,
        true,
      );

      // Rename if needed
      const extractedPath = path.join(
        path.dirname(destinationPath),
        path.basename(normalizedPath),
      );
      if (extractedPath !== destinationPath && fs.existsSync(extractedPath)) {
        fs.renameSync(extractedPath, destinationPath);
      }
    }
  }

  /**
   * Add a file to ZIP
   */
  static addToZip(
    zipFilePath: string,
    sourceFilePath: string,
    internalPath: string,
  ): void {
    // Create or open ZIP
    const zip = fs.existsSync(zipFilePath)
      ? new AdmZip(zipFilePath)
      : new AdmZip();

    const normalizedInternal = internalPath.replace(/\\/g, '/');

    if (fs.statSync(sourceFilePath).isDirectory()) {
      // Add directory
      zip.addLocalFolder(sourceFilePath, normalizedInternal);
    } else {
      // Add file
      zip.addLocalFile(
        sourceFilePath,
        path.dirname(normalizedInternal) || undefined,
      );

      // Rename if needed
      if (path.basename(normalizedInternal) !== path.basename(sourceFilePath)) {
        const entries = zip.getEntries();
        const entry = entries.find(
          (e) => e.entryName === path.basename(sourceFilePath),
        );
        if (entry) {
          entry.entryName = normalizedInternal;
        }
      }
    }

    // Write ZIP file
    zip.writeZip(zipFilePath);
  }
}
