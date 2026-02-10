/**
 * ZIP Helper
 * Helper functions for ZIP file operations
 */

import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface ZipPath {
  zipFile: string;
  internalPath: string;
  isZipPath: boolean;
  nestedZips: string[]; // Array of nested ZIP files in order
  isNestedZip: boolean;
}

export class ZipHelper {
  /**
   * Parse a path that might contain a ZIP file reference (including nested ZIPs)
   * e.g., "D:\archive.zip/folder/file.txt" -> { zipFile: "D:\archive.zip", internalPath: "folder/file.txt" }
   * e.g., "D:\outer.zip/inner.zip/file.txt" -> nested ZIP path
   */
  static parsePath(fullPath: string): ZipPath {
    // Normalize to forward slashes for easier parsing
    const normalized = fullPath.replace(/\\/g, '/');

    // Look for .zip in the path - find ALL .zip occurrences
    const zipMatches: string[] = [];
    const parts = normalized.split('/');

    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      if (parts[i].toLowerCase().endsWith('.zip')) {
        zipMatches.push(currentPath);
      }
    }

    if (zipMatches.length === 0) {
      // No ZIP in path
      return {
        zipFile: '',
        internalPath: '',
        isZipPath: false,
        nestedZips: [],
        isNestedZip: false,
      };
    }

    // Use the first (outermost) ZIP as the main zipFile
    const outerZipFile = zipMatches[0].replace(/\//g, path.sep);
    const remainingPath = normalized.substring(zipMatches[0].length + 1) || '';

    // Only treat as ZIP path if there's something after the ZIP file
    if (!remainingPath) {
      // Just pointing to a ZIP file, not into it
      return {
        zipFile: '',
        internalPath: '',
        isZipPath: false,
        nestedZips: [],
        isNestedZip: false,
      };
    }

    if (zipMatches.length > 1) {
      // Nested ZIP detected
      return {
        zipFile: outerZipFile,
        internalPath: remainingPath,
        isZipPath: true,
        nestedZips: zipMatches
          .slice(1)
          .map((z) => z.substring(zipMatches[0].length + 1)),
        isNestedZip: true,
      };
    }

    // Single ZIP with internal path
    return {
      zipFile: outerZipFile,
      internalPath: remainingPath,
      isZipPath: true,
      nestedZips: [],
      isNestedZip: false,
    };
  }

  /**
   * Check if a path points to a ZIP file
   */
  static isZipFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.zip') && fs.existsSync(filePath);
  }

  /**
   * Check if an entry exists in a ZIP file
   */
  static entryExistsInZip(zipFilePath: string, entryPath: string): boolean {
    if (!fs.existsSync(zipFilePath)) {
      return false;
    }
    try {
      const zip = new AdmZip(zipFilePath);
      const normalizedPath = entryPath.replace(/\\/g, '/');
      const entry = zip.getEntry(normalizedPath);
      return entry !== null;
    } catch {
      return false;
    }
  }

  /**
   * Extract nested ZIP to temp directory and return the temp path
   */
  private static extractNestedZipToTemp(
    outerZipPath: string,
    nestedZipPath: string,
  ): string {
    const tempDir = path.join(os.tmpdir(), `nested-zip-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const tempZipPath = path.join(tempDir, path.basename(nestedZipPath));

    // Extract the nested ZIP file from the outer ZIP
    this.extractFromZip(outerZipPath, nestedZipPath, tempZipPath);

    return tempZipPath;
  }

  /**
   * Handle nested ZIP path by extracting intermediate ZIPs to temp locations
   */
  private static resolveNestedZipPath(zipPath: ZipPath): {
    finalZipPath: string;
    finalInternalPath: string;
    tempPaths: string[];
  } {
    console.log('[resolveNestedZipPath] Starting resolution:', zipPath);

    if (!zipPath.isNestedZip) {
      return {
        finalZipPath: zipPath.zipFile,
        finalInternalPath: zipPath.internalPath,
        tempPaths: [],
      };
    }

    const tempPaths: string[] = [];
    let currentZipPath = zipPath.zipFile;

    // Extract each nested ZIP in sequence
    for (let i = 0; i < zipPath.nestedZips.length; i++) {
      const nestedZip = zipPath.nestedZips[i];
      console.log(
        `[resolveNestedZipPath] Extracting nested ZIP ${i + 1}/${zipPath.nestedZips.length}:`,
        {
          from: currentZipPath,
          zipName: nestedZip,
        },
      );

      try {
        const tempZipPath = this.extractNestedZipToTemp(
          currentZipPath,
          nestedZip,
        );
        console.log('[resolveNestedZipPath] Extracted to temp:', tempZipPath);
        tempPaths.push(path.dirname(tempZipPath));
        currentZipPath = tempZipPath;
      } catch (error) {
        console.error('[resolveNestedZipPath] Extraction failed:', error);
        throw error;
      }
    }

    // The remaining internal path after all the nested ZIPs
    // If internalPath is just the last nested ZIP name, we want empty string (root)
    const lastNestedZip = zipPath.nestedZips[zipPath.nestedZips.length - 1];
    let finalInternalPath = '';

    if (zipPath.internalPath.length > lastNestedZip.length) {
      // There's more path after the last nested ZIP
      finalInternalPath = zipPath.internalPath.substring(
        lastNestedZip.length + 1,
      );
    }

    console.log('[resolveNestedZipPath] Resolved:', {
      finalZipPath: currentZipPath,
      finalInternalPath,
      tempPaths,
    });

    return {
      finalZipPath: currentZipPath,
      finalInternalPath: finalInternalPath,
      tempPaths: tempPaths,
    };
  }

  /**
   * Clean up temp directories
   */
  private static cleanupTempPaths(tempPaths: string[]): void {
    for (const tempPath of tempPaths) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.rmSync(tempPath, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn(`Failed to cleanup temp path ${tempPath}:`, error);
      }
    }
  }

  /**
   * List contents of a ZIP file or folder within ZIP (supports nested ZIPs)
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
        // Direct file - check if it's a ZIP file
        const isZipFile = name.toLowerCase().endsWith('.zip');

        if (isZipFile) {
          // Treat nested ZIP as a directory so it can be navigated
          seenDirs.add(name);
          directories.push({
            name: name,
            path: `${zipFilePath}/${fullInternalPath}`,
            size: entry.header.size,
            created: entry.header.time.toISOString(),
            modified: entry.header.time.toISOString(),
            isDirectory: true,
            isFile: false,
            isZipEntry: true,
          });
        } else {
          // Regular file
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
        }
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

  /**
   * Delete a file or directory from ZIP
   */
  static deleteFromZip(zipFilePath: string, internalPath: string): void {
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`ZIP file does not exist: ${zipFilePath}`);
    }

    const zip = new AdmZip(zipFilePath);
    const normalizedPath = internalPath.replace(/\\/g, '/');

    // Get all entries
    const entries = zip.getEntries();

    // Check if it's a directory by looking for entries that start with this path
    const isDirectory = entries.some(
      (entry) =>
        entry.entryName.replace(/\\/g, '/').startsWith(normalizedPath + '/') ||
        entry.entryName.replace(/\\/g, '/') === normalizedPath + '/',
    );

    if (isDirectory) {
      // Delete all entries that start with this path (directory and its contents)
      const prefix = normalizedPath.endsWith('/')
        ? normalizedPath
        : normalizedPath + '/';

      for (const entry of entries) {
        const entryPath = entry.entryName.replace(/\\/g, '/');
        if (
          entryPath.startsWith(prefix) ||
          entryPath === normalizedPath ||
          entryPath === normalizedPath + '/'
        ) {
          zip.deleteFile(entry.entryName);
        }
      }
    } else {
      // Delete single file
      zip.deleteFile(normalizedPath);
    }

    // Write ZIP file
    zip.writeZip(zipFilePath);
  }
}
