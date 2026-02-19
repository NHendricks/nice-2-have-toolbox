import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import sizeOf from 'image-size';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface';

const execAsync = promisify(exec);

/**
 * Scanner Command
 * Handles scanning documents from connected scanners/printers
 */
export class ScannerCommand implements ICommand {
  private progressCallback?: (
    pageNumber: number,
    fileName: string,
    fileSize: number,
  ) => void;

  /**
   * Set progress callback for real-time updates
   */
  setProgressCallback(
    callback?: (pageNumber: number, fileName: string, fileSize: number) => void,
  ): void {
    this.progressCallback = callback;
  }

  getDescription(): string {
    return 'Scanner & Document Manager - Scan PDFs from your scanner/printer';
  }

  getParameters(): CommandParameter[] {
    return [
      {
        name: 'action',
        type: 'select',
        description: 'Action to perform',
        required: true,
        options: [
          'list-scanners',
          'scan',
          'scan-preview',
          'finalize-scan',
          'cleanup-scan',
          'list-documents',
          'open-document',
          'delete-document',
        ],
      },
      {
        name: 'outputPath',
        type: 'string',
        description: 'Output directory for scanned documents',
        required: false,
        default: '',
      },
      {
        name: 'fileName',
        type: 'string',
        description: 'File name for the scanned document',
        required: false,
      },
      {
        name: 'scannerId',
        type: 'string',
        description: 'ID of the scanner to use (leave empty for default)',
        required: false,
      },
      {
        name: 'format',
        type: 'select',
        description: 'Output format',
        required: false,
        options: ['pdf', 'png', 'jpg'],
        default: 'pdf',
      },
      {
        name: 'multiPage',
        type: 'boolean',
        description: 'Scan all pages from ADF (Automatic Document Feeder)',
        required: false,
        default: true,
      },
      {
        name: 'files',
        type: 'string',
        description:
          'JSON array of file paths (for finalize-scan/cleanup-scan)',
        required: false,
      },
      {
        name: 'tempDir',
        type: 'string',
        description: 'Temp directory path (for cleanup-scan)',
        required: false,
      },
    ];
  }

  async execute(params: any): Promise<any> {
    const {
      action,
      outputPath,
      fileName,
      scannerId,
      resolution,
      format,
      multiPage,
      files,
      tempDir,
    } = params;

    try {
      switch (action) {
        case 'list-scanners':
          return await this.listScanners();
        case 'scan':
          return await this.scanDocument(
            outputPath,
            fileName,
            scannerId,
            resolution,
            format,
            multiPage !== false, // default true
          );
        case 'scan-preview':
          return await this.scanPreview(
            scannerId,
            resolution,
            multiPage !== false,
          );
        case 'finalize-scan':
          return await this.finalizeScan(files, outputPath, fileName, format);
        case 'cleanup-scan':
          return await this.cleanupScan(files, tempDir);
        case 'list-documents':
          return await this.listDocuments(outputPath);
        case 'open-document':
          return await this.openDocument(outputPath, fileName);
        case 'delete-document':
          return await this.deleteDocument(outputPath, fileName);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Command execution failed',
      };
    }
  }

  /**
   * List available scanners
   */
  private async listScanners(): Promise<any> {
    try {
      // Try to detect scanners on Windows, Mac, and Linux
      if (process.platform === 'win32') {
        // Windows: Use WIA (Windows Image Acquisition) to actually list scanners
        try {
          const psScript = `
$ErrorActionPreference = 'Stop'
try {
    $deviceManager = New-Object -ComObject WIA.DeviceManager
    $scanners = @()

    foreach ($deviceInfo in $deviceManager.DeviceInfos) {
        $scanner = @{
            DeviceID = $deviceInfo.DeviceID
            Name = $deviceInfo.Properties.Item("Name").Value
            Manufacturer = ""
            Description = ""
        }

        # Try to get manufacturer
        try {
            $scanner.Manufacturer = $deviceInfo.Properties.Item("Manufacturer").Value
        } catch {}

        # Try to get description
        try {
            $scanner.Description = $deviceInfo.Properties.Item("Description").Value
        } catch {}

        $scanners += $scanner
    }

    $scanners | ConvertTo-Json -Compress
    exit 0
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
    exit 1
}
`;

          const tempScript = path.join(
            process.env.TEMP || '',
            'list_wia_scanners.ps1',
          );
          fs.writeFileSync(tempScript, psScript, 'utf8');

          try {
            const { stdout } = await execAsync(
              `powershell -ExecutionPolicy Bypass -NoProfile -File "${tempScript}"`,
              { timeout: 10000 },
            );

            if (fs.existsSync(tempScript)) {
              fs.unlinkSync(tempScript);
            }

            if (stdout.includes('ERROR:')) {
              return {
                success: false,
                error: stdout,
                platform: 'windows',
                message:
                  'Failed to query WIA for scanners. Make sure WIA service is running.',
              };
            }

            const trimmedOutput = stdout.trim();
            if (!trimmedOutput || trimmedOutput === '[]') {
              return {
                success: true,
                scanners: [],
                platform: 'windows',
                message:
                  'No scanners found. Please check: 1) Scanner is connected and powered on, 2) Scanner drivers are installed, 3) Scanner supports WIA protocol',
              };
            }

            // Parse JSON output
            let scannerData = JSON.parse(trimmedOutput);
            // If single scanner, wrap in array
            if (!Array.isArray(scannerData)) {
              scannerData = [scannerData];
            }

            const scanners = scannerData.map((s: any) => ({
              id: s.DeviceID || 'unknown',
              name: s.Name || 'Unknown Scanner',
              manufacturer: s.Manufacturer || '',
              description: s.Description || '',
              type: 'WIA',
            }));

            return {
              success: true,
              scanners,
              platform: 'windows',
              count: scanners.length,
              message: `Found ${scanners.length} scanner${scanners.length !== 1 ? 's' : ''}`,
            };
          } catch (error: any) {
            if (fs.existsSync(tempScript)) {
              fs.unlinkSync(tempScript);
            }
            throw error;
          }
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            platform: 'windows',
            message:
              'Failed to detect scanners. Make sure your scanner is connected and WIA service is running.',
          };
        }
      } else if (process.platform === 'darwin') {
        // macOS: Try to use scanimage (if available)
        try {
          const { stdout } = await execAsync('scanimage -L');
          return {
            success: true,
            scanners: this.parseScanImageOutput(stdout),
            platform: 'macos',
            rawOutput: stdout,
          };
        } catch (error) {
          return {
            success: true,
            scanners: [],
            platform: 'macos',
            message:
              'No scanners found. Install SANE (scanimage) for scanner support: brew install sane-backends',
          };
        }
      } else {
        // Linux: Use scanimage
        try {
          const { stdout } = await execAsync('scanimage -L');
          return {
            success: true,
            scanners: this.parseScanImageOutput(stdout),
            platform: 'linux',
            rawOutput: stdout,
          };
        } catch (error) {
          return {
            success: true,
            scanners: [],
            platform: 'linux',
            message:
              'No scanners found. Install SANE: sudo apt-get install sane sane-utils',
          };
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Scan a document
   */
  private async scanDocument(
    outputPath: string,
    fileName: string,
    scannerId: string = '',
    resolution: string = '300',
    format: string = 'pdf',
    multiPage: boolean = true,
  ): Promise<any> {
    try {
      // Ensure output directory exists
      const baseDir =
        outputPath ||
        path.join(
          process.env.USERPROFILE || process.env.HOME || '',
          'Documents',
          'Scans',
        );
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      // Generate filename if not provided
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      const finalFileName = fileName || `scan_${timestamp}.${format}`;
      const outputFile = path.join(baseDir, finalFileName);

      if (process.platform === 'win32') {
        // Windows scanning using PowerShell and WIA - always scan in color
        return await this.scanWindowsWIA(
          outputFile,
          scannerId,
          resolution,
          format,
          multiPage,
        );
      } else {
        // Unix-like systems (macOS, Linux) using scanimage - always scan in color
        return await this.scanUnixSANE(
          outputFile,
          scannerId,
          resolution,
          format,
        );
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Scan on Windows using WIA - always scans in color
   */
  private async scanWindowsWIA(
    outputFile: string,
    scannerId: string,
    resolution: string,
    format: string,
    multiPage: boolean,
  ): Promise<any> {
    try {
      // Improved PowerShell script for WIA scanning
      const dpiValue = parseInt(resolution);

      // Always scan in color (Color Intent: 1 = Color)
      const colorIntent = 1;

      // WIA's PDF output is unreliable, so we'll scan as PNG and convert to PDF if needed
      const scanAsPdf = format === 'pdf';
      const actualFormat = scanAsPdf ? 'png' : format;

      // Determine output format ID (scan as PNG for PDF conversion)
      const formatId =
        actualFormat === 'jpg'
          ? '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}' // JPEG
          : '{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}'; // PNG

      // Temporary file for PNG if converting to PDF
      const tempOutputFile = scanAsPdf
        ? outputFile.replace(/\.pdf$/i, '.png')
        : outputFile;

      // First, check if WIA is available and if scanners are present
      const checkScript = `
$ErrorActionPreference = 'Stop'
try {
    $deviceManager = New-Object -ComObject WIA.DeviceManager
    if ($deviceManager.DeviceInfos.Count -eq 0) {
        Write-Output "NO_SCANNERS"
        exit 1
    }
    Write-Output "SCANNERS_FOUND:$($deviceManager.DeviceInfos.Count)"
    exit 0
} catch {
    Write-Output "WIA_ERROR:$($_.Exception.Message)"
    exit 1
}
`;

      const tempCheckScript = path.join(
        process.env.TEMP || '',
        'check_wia.ps1',
      );
      fs.writeFileSync(tempCheckScript, checkScript, 'utf8');

      try {
        const { stdout: checkOutput } = await execAsync(
          `powershell -ExecutionPolicy Bypass -NoProfile -File "${tempCheckScript}"`,
        );

        if (fs.existsSync(tempCheckScript)) {
          fs.unlinkSync(tempCheckScript);
        }

        if (checkOutput.includes('NO_SCANNERS')) {
          return {
            success: false,
            error: 'No scanners detected by WIA',
            message:
              'No scanners found. Please check: 1) Scanner is connected and powered on, 2) Scanner drivers are installed, 3) Scanner supports WIA protocol',
          };
        }

        if (checkOutput.includes('WIA_ERROR')) {
          return {
            success: false,
            error: checkOutput,
            message:
              'WIA (Windows Image Acquisition) service error. Try restarting the scanner or checking device drivers.',
          };
        }
      } catch (checkError: any) {
        if (fs.existsSync(tempCheckScript)) {
          fs.unlinkSync(tempCheckScript);
        }
        return {
          success: false,
          error: checkError.message,
          message:
            'Failed to check WIA availability. WIA service may not be running.',
        };
      }

      // Now perform the actual scan
      const scannerIdParam = scannerId ? `"${scannerId}"` : '""';
      const multiPageEnabled = multiPage ? '$true' : '$false';

      // For multi-page, we need a temp directory
      const tempDir = path.join(process.env.TEMP || '', `scan_${Date.now()}`);

      const psScript = `
Write-Host "=== SCRIPT START ==="
try {
    Write-Host "DEBUG: Creating WIA DeviceManager"
    $deviceManager = New-Object -ComObject WIA.DeviceManager
    Write-Host "DEBUG: DeviceManager created, scanner count: $($deviceManager.DeviceInfos.Count)"

    # Get scanner by ID or use first available
    if ($deviceManager.DeviceInfos.Count -eq 0) {
        Write-Error "No scanners found"
        exit 1
    }

    $targetScannerId = ${scannerIdParam}
    $deviceInfo = $null
    Write-Host "DEBUG: Looking for scanner ID: $targetScannerId"

    if ($targetScannerId -ne "") {
        # Find scanner by Device ID
        Write-Host "DEBUG: Searching for specific scanner"
        foreach ($info in $deviceManager.DeviceInfos) {
            if ($info.DeviceID -eq $targetScannerId) {
                $deviceInfo = $info
                Write-Host "Using scanner: $($info.Properties.Item('Name').Value)"
                break
            }
        }
        if ($deviceInfo -eq $null) {
            Write-Error "Scanner with ID '$targetScannerId' not found"
            exit 1
        }
    } else {
        # Use first available scanner
        Write-Host "DEBUG: Using first available scanner"
        $deviceInfo = $deviceManager.DeviceInfos.Item(1)
        Write-Host "Using default scanner: $($deviceInfo.Properties.Item('Name').Value)"
    }

    Write-Host "DEBUG: Attempting to connect to device..."
    
    # Add longer delay before connection attempt to let scanner recover from previous operation
    Start-Sleep -Milliseconds 1000
    
    # Retry logic for device connection (Canon scanners sometimes need multiple attempts)
    $maxRetries = 7
    $device = $null
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        try {
            Write-Host "DEBUG: Connection attempt $($retryCount + 1) of $maxRetries..."
            $device = $deviceInfo.Connect()
            Write-Host "DEBUG: Device connected successfully"
            break
        } catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                $waitTime = 1500 * $retryCount  # Exponential backoff: 1.5s, 3s, 4.5s, 6s
                Write-Host "DEBUG: Connection failed, retrying in $($waitTime)ms... Error: $($_.Exception.Message)"
                Start-Sleep -Milliseconds $waitTime
            } else {
                Write-Host "DEBUG: All connection attempts failed"
                throw $_
            }
        }
    }
    
    if ($device -eq $null) {
        throw "Failed to connect to scanner after $maxRetries attempts"
    }
    
    # Additional delay to ensure device is fully ready
    Start-Sleep -Milliseconds 500

    Write-Host "DEBUG: Getting scanner item..."
    $item = $device.Items.Item(1)
    Write-Host "DEBUG: Item retrieved successfully"

    $multiPageEnabled = ${multiPageEnabled}

    Write-Host "DEBUG: Setting resolution and color mode..."
    # Try to set resolution (Property IDs: 6147=Vertical, 6148=Horizontal DPI)
    try {
        # Set horizontal resolution
        $horizontalRes = $item.Properties.Item("6147")
        if ($horizontalRes -ne $null) {
            $horizontalRes.Value = ${dpiValue}
        }

        # Set vertical resolution
        $verticalRes = $item.Properties.Item("6148")
        if ($verticalRes -ne $null) {
            $verticalRes.Value = ${dpiValue}
        }
    } catch {
        Write-Warning "Could not set resolution: $_"
    }

    # Try to set color mode (Property ID: 6146)
    try {
        $colorProp = $item.Properties.Item("6146")
        if ($colorProp -ne $null) {
            $colorProp.Value = ${colorIntent}
        }
    } catch {
        Write-Warning "Could not set color mode: $_"
    }
    Write-Host "DEBUG: Resolution and color mode configured"

    # Create temp directory for multi-page scans
    Write-Host "DEBUG: Creating temp directory if needed..."
    $tempDir = "${tempDir.replace(/\\/g, '\\\\')}"
    if ($multiPageEnabled) {
        New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
        Write-Host "DEBUG: Temp directory created: $tempDir"
    }

    # Perform the scan (multi-page loop)
    Write-Host "DEBUG: About to start scan loop"
    Write-Host "Starting scan..."
    $pageNumber = 1
    $scannedFiles = @()

    do {
        try {
            Write-Host "Scanning page $pageNumber..."

            # Create image process for format conversion
            $imageProcess = New-Object -ComObject WIA.ImageProcess
            $imageProcess.Filters.Add($imageProcess.FilterInfos.Item("Convert").FilterID)
            $imageProcess.Filters.Item(1).Properties.Item("FormatID").Value = "${formatId}"

            # Transfer image from scanner
            $image = $item.Transfer("${formatId}")

            # Process image
            $image = $imageProcess.Apply($image)

            # Determine output file path
            if ($multiPageEnabled) {
                $outputPath = "$tempDir\\page_$pageNumber.png"
            } else {
                $outputPath = "${tempOutputFile.replace(/\\/g, '\\\\')}"
            }

            # Save image
            Write-Host "DEBUG: Saving page $pageNumber to disk..."
            $saveStartTime = Get-Date
            $image.SaveFile($outputPath)
            $saveEndTime = Get-Date
            $saveDuration = ($saveEndTime - $saveStartTime).TotalMilliseconds
            $scannedFiles += $outputPath
            
            # Get file size
            $fileInfo = Get-Item $outputPath
            $fileSizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
            
            Write-Host "DEBUG: Page $pageNumber saved in $($saveDuration)ms, size: $($fileSizeKB) KB"
            Write-Host "DEBUG: File location: $outputPath"

            $pageNumber++

            # If not multi-page, break after first page
            if (-not $multiPageEnabled) {
                break
            }

            # Small delay between pages
            Start-Sleep -Milliseconds 500

        } catch {
            # Check if error is due to no more pages
            if ($_.Exception.Message -match "feeder|empty|no.*document" -or $pageNumber -gt 1) {
                Write-Host "No more pages in feeder (scanned $($pageNumber - 1) pages)"
                break
            } else {
                throw $_
            }
        }
    } while ($multiPageEnabled)

    # Output scanned file paths as JSON
    $result = @{
        success = $true
        pageCount = $scannedFiles.Count
        files = $scannedFiles
        tempDir = if ($multiPageEnabled) { $tempDir } else { "" }
    }

    $result | ConvertTo-Json -Compress
    Write-Host "Scan completed successfully - $($scannedFiles.Count) page(s)"
    
    # Release COM objects to free the scanner device
    Write-Host "DEBUG: Releasing COM objects..."
    if ($item -ne $null) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($item) | Out-Null
    }
    if ($imageProcess -ne $null) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($imageProcess) | Out-Null
    }
    if ($device -ne $null) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($device) | Out-Null
    }
    if ($deviceManager -ne $null) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($deviceManager) | Out-Null
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    Write-Host "DEBUG: COM objects released"
    
    # Additional delay after cleanup to let scanner fully reset
    Start-Sleep -Milliseconds 1000
    Write-Host "DEBUG: Scanner reset complete"
    
    exit 0
    
} catch {
    Write-Error "Scan failed: $_"
    Write-Error $_.Exception.Message
    
    # Release COM objects even on error
    Write-Host "DEBUG: Releasing COM objects after error..."
    try {
        if ($item -ne $null) {
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($item) | Out-Null
        }
        if ($imageProcess -ne $null) {
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($imageProcess) | Out-Null
        }
        if ($device -ne $null) {
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($device) | Out-Null
        }
        if ($deviceManager -ne $null) {
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($deviceManager) | Out-Null
        }
        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
        Write-Host "DEBUG: COM objects released after error"
    } catch {
        Write-Host "DEBUG: Error during COM cleanup (non-fatal): $_"
    }
    
    exit 1
}
`;

      const tempScript = path.join(process.env.TEMP || '', 'scan_wia.ps1');
      fs.writeFileSync(tempScript, psScript, 'utf8');

      try {
        console.log('========================================');
        console.log('Starting WIA scan...');
        console.log(`Scanner ID: ${scannerId || '(default)'}`);
        console.log(`Resolution: ${resolution} DPI`);
        console.log(`Format: ${format} (actual: ${actualFormat})`);
        console.log(`Multi-page: ${multiPage}`);
        console.log(`Output file: ${outputFile}`);
        console.log(`Temp directory: ${tempDir}`);
        console.log('========================================');

        const startTime = Date.now();

        // Create temp directory first so we can watch it
        if (multiPage) {
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log(`[SETUP] Created temp directory: ${tempDir}`);
          }
        }

        // Set up Node.js file system watcher for the temp directory
        let fsWatcher: fs.FSWatcher | null = null;
        let pageCounter = 0;
        if (multiPage) {
          console.log(`[WATCHER] Monitoring directory: ${tempDir}`);
          fsWatcher = fs.watch(tempDir, (eventType, filename) => {
            if (filename && filename.endsWith('.png')) {
              const timestamp = new Date()
                .toISOString()
                .split('T')[1]
                .substring(0, 12);
              console.log(`[${timestamp}] WATCHER: ${eventType} - ${filename}`);

              // Log file size and emit progress event if it exists
              const filePath = path.join(tempDir, filename);
              if (eventType === 'rename' && fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const sizeKB = Math.round((stats.size / 1024) * 100) / 100;
                console.log(`[${timestamp}] WATCHER: File size: ${sizeKB} KB`);

                // Emit progress callback for IPC with base64 preview
                pageCounter++;
                if (this.progressCallback) {
                  // Small delay to ensure file is fully written before reading
                  setTimeout(() => {
                    try {
                      if (fs.existsSync(filePath)) {
                        const fileData = fs.readFileSync(filePath);
                        const base64Preview = `data:image/png;base64,${fileData.toString('base64')}`;
                        (this.progressCallback as any)(
                          pageCounter,
                          filename,
                          stats.size,
                          filePath,
                          base64Preview,
                        );
                        console.log(
                          `[WATCHER] Emitted progress event for page ${pageCounter}`,
                        );
                      }
                    } catch (err) {
                      console.error(`[WATCHER] Failed to create preview:`, err);
                    }
                  }, 100); // 100ms delay to let file finish writing
                }
              }
            }
          });
        }

        // Use spawn instead of exec to stream output in real-time
        const psProcess = spawn('powershell', [
          '-ExecutionPolicy',
          'Bypass',
          '-NoProfile',
          '-File',
          tempScript,
        ]);

        let stdout = '';
        let stderr = '';

        // Stream stdout in real-time
        psProcess.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          // Log each line immediately to backend console
          output.split('\n').forEach((line: string) => {
            if (line.trim()) {
              console.log(`[PS] ${line.trim()}`);
            }
          });
        });

        // Stream stderr in real-time
        psProcess.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          // Log errors immediately
          output.split('\n').forEach((line: string) => {
            if (line.trim()) {
              console.error(`[PS ERROR] ${line.trim()}`);
            }
          });
        });

        // Wait for process to complete
        await new Promise<void>((resolve, reject) => {
          psProcess.on('close', (code) => {
            const endTime = Date.now();

            // Close file system watcher
            if (fsWatcher) {
              fsWatcher.close();
              console.log('[WATCHER] File system monitor closed');
            }

            console.log('========================================');
            console.log(
              `WIA scan completed in ${endTime - startTime}ms (exit code: ${code})`,
            );
            console.log('========================================');

            if (code !== 0) {
              reject(new Error(`PowerShell process exited with code ${code}`));
            } else {
              resolve();
            }
          });

          psProcess.on('error', (error) => {
            if (fsWatcher) {
              fsWatcher.close();
            }
            reject(error);
          });

          // Set timeout
          setTimeout(() => {
            if (fsWatcher) {
              fsWatcher.close();
            }
            psProcess.kill();
            reject(new Error('Scan operation timed out after 5 minutes'));
          }, 300000);
        });

        // Clean up temp script
        if (fs.existsSync(tempScript)) {
          fs.unlinkSync(tempScript);
        }

        // Parse the JSON result from PowerShell
        const lines = stdout.split('\n');
        let scanResult: any = null;

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{')) {
            try {
              scanResult = JSON.parse(trimmed);
              break;
            } catch (e) {
              // Not JSON, continue
            }
          }
        }

        if (!scanResult || !scanResult.files || scanResult.files.length === 0) {
          // Fallback: check if single file exists
          if (fs.existsSync(tempOutputFile)) {
            scanResult = {
              success: true,
              pageCount: 1,
              files: [tempOutputFile],
              tempDir: '',
            };
          } else {
            throw new Error('Scan completed but no files were created');
          }
        }

        console.log(
          `Scanned ${scanResult.pageCount} page(s): ${scanResult.files.join(', ')}`,
        );

        // Process the scanned files
        try {
          if (scanAsPdf) {
            console.log('Converting to PDF...');
            await this.convertImagesToPdf(scanResult.files, outputFile);

            // Clean up temporary files
            for (const file of scanResult.files) {
              if (fs.existsSync(file)) {
                fs.unlinkSync(file);
              }
            }

            // Clean up temp directory if it exists
            if (scanResult.tempDir && fs.existsSync(scanResult.tempDir)) {
              fs.rmdirSync(scanResult.tempDir);
            }

            const stats = fs.statSync(outputFile);
            return {
              success: true,
              outputFile,
              message: `Scanned ${scanResult.pageCount} page(s) and converted to PDF: ${outputFile}`,
              method: 'WIA + PNG-to-PDF conversion',
              pageCount: scanResult.pageCount,
              fileSize: stats.size,
              debugOutput:
                stdout + (stderr ? '\n\n=== STDERR ===\n' + stderr : ''),
            };
          } else {
            // Not PDF - if multi-page, just return first page or error
            if (scanResult.pageCount > 1) {
              return {
                success: false,
                error:
                  'Multi-page scanning is only supported for PDF format. Please select PDF format.',
                files: scanResult.files,
              };
            }

            const stats = fs.statSync(scanResult.files[0]);
            return {
              success: true,
              outputFile: scanResult.files[0],
              message: `Document scanned successfully to ${scanResult.files[0]}`,
              method: 'WIA',
              pageCount: 1,
              fileSize: stats.size,
              debugOutput:
                stdout + (stderr ? '\n\n=== STDERR ===\n' + stderr : ''),
            };
          }
        } catch (conversionError: any) {
          console.error('PDF conversion failed:', conversionError.message);
          return {
            success: false,
            error: 'PDF conversion failed: ' + conversionError.message,
            files: scanResult.files,
          };
        }
      } catch (error: any) {
        // Clean up on error
        if (fs.existsSync(tempScript)) {
          fs.unlinkSync(tempScript);
        }

        // Log detailed error information
        console.log('========================================');
        console.log('WIA SCAN FAILED');
        console.log('Error message:', error.message);
        console.log('========================================');

        if (error.stdout) {
          console.log('Error stdout:');
          console.log(error.stdout);
          console.log('========================================');
        }

        if (error.stderr) {
          console.log('Error stderr:');
          console.log(error.stderr);
          console.log('========================================');
        }

        throw error;
      }
    } catch (error: any) {
      console.log('========================================');
      console.log('EXCEPTION CAUGHT IN scanWindowsWIA');
      console.log('Error type:', error.constructor.name);
      console.log('Error message:', error.message);
      console.log('========================================');

      const errorDetails = {
        success: false,
        error: error.message,
        stderr: error.stderr || '',
        stdout: error.stdout || '',
        message:
          'Windows scanning failed. Make sure your scanner is connected and powered on.',
        help:
          'Troubleshooting steps:\n' +
          '1. Check scanner is connected via USB and powered on\n' +
          '2. Install manufacturer drivers from scanner website\n' +
          '3. Test scanner in "Windows Fax and Scan" app\n' +
          '4. Check Device Manager for scanner device\n' +
          '5. Restart the WIA service: services.msc -> Windows Image Acquisition (WIA)',
      };

      // Add more specific error messages based on error content
      if (error.message.includes('timeout')) {
        errorDetails.message =
          'Scan operation timed out. Scanner may be offline or not responding.';
        console.log('Detected: TIMEOUT error');
      } else if (error.message.includes('No scanners found')) {
        errorDetails.message =
          'No scanners detected. Please check scanner connection and drivers.';
        console.log('Detected: NO SCANNERS error');
      }

      console.log('Returning error details to frontend');
      console.log('========================================');
      return errorDetails;
    }
  }

  /**
   * Convert multiple images (PNG/JPG) to a multi-page PDF using PDFKit
   */
  private async convertImagesToPdf(
    inputFiles: string[],
    outputFile: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!inputFiles || inputFiles.length === 0) {
          reject(new Error('No input files provided'));
          return;
        }

        console.log(
          `Converting ${inputFiles.length} image(s) to PDF: ${outputFile}`,
        );

        // Get dimensions of first image to set initial page size
        const firstImageBuffer = fs.readFileSync(inputFiles[0]);
        const firstDimensions = sizeOf(firstImageBuffer);

        // Create PDF with page size matching the first image
        const doc = new PDFDocument({
          size: [firstDimensions.width || 612, firstDimensions.height || 792],
          margin: 0,
          autoFirstPage: false, // We'll add pages manually
        });

        // Pipe to file
        const writeStream = fs.createWriteStream(outputFile);
        doc.pipe(writeStream);

        // Add each image as a separate page
        for (let i = 0; i < inputFiles.length; i++) {
          const inputFile = inputFiles[i];
          console.log(
            `Adding page ${i + 1}/${inputFiles.length}: ${inputFile}`,
          );

          // Get dimensions for this image
          const imageBuffer = fs.readFileSync(inputFile);
          const dimensions = sizeOf(imageBuffer);

          if (!dimensions.width || !dimensions.height) {
            console.warn(
              `Could not determine dimensions for ${inputFile}, using defaults`,
            );
            doc.addPage();
          } else {
            // Add a new page with size matching this image
            doc.addPage({
              size: [dimensions.width, dimensions.height],
              margin: 0,
            });
          }

          // Add the image to fill the entire page
          doc.image(inputFile, 0, 0, {
            width: dimensions.width || doc.page.width,
            height: dimensions.height || doc.page.height,
          });
        }

        // Finalize the PDF
        doc.end();

        writeStream.on('finish', () => {
          console.log('PDF created successfully');
          resolve();
        });

        writeStream.on('error', (error) => {
          reject(new Error(`Failed to write PDF: ${error.message}`));
        });
      } catch (error: any) {
        reject(new Error(`PDF conversion failed: ${error.message}`));
      }
    });
  }

  /**
   * Scan on Unix systems using SANE/scanimage - always scans in color
   */
  private async scanUnixSANE(
    outputFile: string,
    scannerId: string,
    resolution: string,
    format: string,
  ): Promise<any> {
    try {
      // Always scan in color
      const mode = 'Color';
      const scanFormat = format === 'pdf' ? 'tiff' : format;

      // Scan to temporary file first
      const tempFile = outputFile.replace(/\.[^.]+$/, `.${scanFormat}`);

      const scanCmd = `scanimage --resolution ${resolution} --mode ${mode} --format ${scanFormat} > "${tempFile}"`;
      await execAsync(scanCmd);

      // Convert to PDF if needed
      if (format === 'pdf' && scanFormat === 'tiff') {
        // Try to use ImageMagick convert
        try {
          await execAsync(`convert "${tempFile}" "${outputFile}"`);
          fs.unlinkSync(tempFile);
        } catch (error) {
          // If convert fails, just rename the tiff
          fs.renameSync(tempFile, outputFile);
        }
      }

      return {
        success: true,
        outputFile,
        message: `Document scanned successfully to ${outputFile}`,
        method: 'SANE',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message:
          'Unix scanning failed. Make sure SANE is installed and your scanner is connected.',
        help: 'Install SANE: brew install sane-backends (macOS) or sudo apt-get install sane sane-utils (Linux)',
      };
    }
  }

  /**
   * Scan to preview - scans pages to temp PNGs without creating PDF (always in color)
   */
  private async scanPreview(
    scannerId: string = '',
    resolution: string = '300',
    multiPage: boolean = true,
  ): Promise<any> {
    try {
      if (process.platform !== 'win32') {
        return {
          success: false,
          error: 'scan-preview is currently only supported on Windows',
        };
      }

      // Generate a temp output file path and ensure directory exists
      const tempDir = path.join(
        process.env.TEMP || '',
        `scan_preview_${Date.now()}`,
      );
      fs.mkdirSync(tempDir, { recursive: true });
      const tempOutputFile = path.join(tempDir, 'page.png');

      // Scan as PNG in color mode
      const result = await this.scanWindowsWIA(
        tempOutputFile,
        scannerId,
        resolution,
        'png',
        multiPage,
      );

      // Collect PNG files from result or from disk
      const resultFiles: string[] = result.files || [];
      if (result.outputFile && !resultFiles.includes(result.outputFile)) {
        resultFiles.push(result.outputFile);
      }

      // Also scan the temp directory for any PNG files
      const scanTempDir =
        resultFiles.length > 0 ? path.dirname(resultFiles[0]) : tempDir;

      const files: string[] = [];
      if (fs.existsSync(scanTempDir)) {
        const dirFiles = fs.readdirSync(scanTempDir);
        for (const f of dirFiles) {
          if (f.endsWith('.png')) {
            const fullPath = path.join(scanTempDir, f);
            if (!files.includes(fullPath)) {
              files.push(fullPath);
            }
          }
        }
        files.sort();
      }

      // Fallback: use files from result if directory scan found nothing
      if (files.length === 0) {
        for (const f of resultFiles) {
          if (fs.existsSync(f)) {
            files.push(f);
          }
        }
      }

      if (files.length === 0) {
        return {
          success: false,
          error: result.error || 'Scan completed but no files were created',
          message: result.message,
        };
      }

      // Convert files to base64 data URLs for display in Electron
      const previews: string[] = [];
      for (const f of files) {
        const data = fs.readFileSync(f);
        previews.push(`data:image/png;base64,${data.toString('base64')}`);
      }

      return {
        success: true,
        files,
        previews,
        tempDir: scanTempDir,
        pageCount: files.length,
        message: `Scanned ${files.length} page(s) - ready for review`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Finalize scan - create PDF from selected image files
   */
  private async finalizeScan(
    files: string | string[],
    outputPath: string,
    fileName: string,
    format: string = 'pdf',
  ): Promise<any> {
    try {
      const fileList = typeof files === 'string' ? JSON.parse(files) : files;

      if (!fileList || fileList.length === 0) {
        return {
          success: false,
          error: 'No files provided',
        };
      }

      const baseDir =
        outputPath ||
        path.join(
          process.env.USERPROFILE || process.env.HOME || '',
          'Documents',
          'Scans',
        );
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      const finalFileName = fileName || `scan_${timestamp}.${format}`;
      const outputFile = path.join(baseDir, finalFileName);

      if (format === 'pdf') {
        await this.convertImagesToPdf(fileList, outputFile);
      } else {
        // For non-PDF, copy the first file
        fs.copyFileSync(fileList[0], outputFile);
      }

      // Clean up temp files
      const tempDirs = new Set<string>();
      for (const file of fileList) {
        tempDirs.add(path.dirname(file));
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
      // Clean up temp directories
      for (const dir of tempDirs) {
        try {
          if (fs.existsSync(dir) && dir.includes('scan_')) {
            const remaining = fs.readdirSync(dir);
            if (remaining.length === 0) {
              fs.rmdirSync(dir);
            }
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      const stats = fs.statSync(outputFile);
      return {
        success: true,
        outputFile,
        message: `Created ${format.toUpperCase()} with ${fileList.length} page(s): ${outputFile}`,
        pageCount: fileList.length,
        fileSize: stats.size,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cleanup scan - delete temp files when user cancels
   */
  private async cleanupScan(
    files: string | string[] | undefined,
    tempDir: string | undefined,
  ): Promise<any> {
    try {
      const fileList =
        typeof files === 'string' ? JSON.parse(files) : files || [];

      for (const file of fileList) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }

      if (tempDir && fs.existsSync(tempDir)) {
        // Delete any remaining files in the temp directory
        const remaining = fs.readdirSync(tempDir);
        for (const f of remaining) {
          fs.unlinkSync(path.join(tempDir, f));
        }
        fs.rmdirSync(tempDir);
      }

      return {
        success: true,
        message: 'Temp files cleaned up',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List scanned documents
   */
  private async listDocuments(outputPath: string): Promise<any> {
    try {
      const baseDir =
        outputPath ||
        path.join(
          process.env.USERPROFILE || process.env.HOME || '',
          'Documents',
          'Scans',
        );

      if (!fs.existsSync(baseDir)) {
        return {
          success: true,
          documents: [],
          directory: baseDir,
          message:
            'Scan directory does not exist yet. It will be created when you scan your first document.',
        };
      }

      const files = fs.readdirSync(baseDir);
      const documents = files
        .filter((file) => /\.(pdf|png|jpg|jpeg|tiff)$/i.test(file))
        .map((file) => {
          const filePath = path.join(baseDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
          };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());

      return {
        success: true,
        documents,
        directory: baseDir,
        count: documents.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Open a document
   */
  private async openDocument(
    outputPath: string,
    fileName: string,
  ): Promise<any> {
    try {
      const baseDir =
        outputPath ||
        path.join(
          process.env.USERPROFILE || process.env.HOME || '',
          'Documents',
          'Scans',
        );
      const filePath = path.join(baseDir, fileName);

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
        };
      }

      // Open file with default application
      const openCmd =
        process.platform === 'win32'
          ? 'start ""'
          : process.platform === 'darwin'
            ? 'open'
            : 'xdg-open';
      await execAsync(`${openCmd} "${filePath}"`);

      return {
        success: true,
        message: `Opened ${fileName}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a document
   */
  private async deleteDocument(
    outputPath: string,
    fileName: string,
  ): Promise<any> {
    try {
      const baseDir =
        outputPath ||
        path.join(
          process.env.USERPROFILE || process.env.HOME || '',
          'Documents',
          'Scans',
        );
      const filePath = path.join(baseDir, fileName);

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
        };
      }

      fs.unlinkSync(filePath);

      return {
        success: true,
        message: `Deleted ${fileName}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse scanimage -L output
   */
  private parseScanImageOutput(output: string): any[] {
    const scanners: any[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('device')) {
        const match = line.match(/`([^']+)'/);
        if (match) {
          scanners.push({
            name: match[1],
            description: line,
          });
        }
      }
    }

    return scanners;
  }
}
