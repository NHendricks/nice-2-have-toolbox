import { ChildProcess, exec, spawn } from 'child_process';
import * as fs from 'fs';
import sizeOf from 'image-size';
import * as os from 'os';
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
  private activeProcess: ChildProcess | null = null;
  private scanimagePath: string | null = null;

  /**
   * Find the scanimage binary in common locations
   * Caches the result for subsequent calls
   */
  private async findScanimage(): Promise<string> {
    if (this.scanimagePath) {
      return this.scanimagePath;
    }

    // Common paths where scanimage might be installed
    const possiblePaths = [
      '/opt/homebrew/bin/scanimage', // Homebrew Apple Silicon
      '/usr/local/bin/scanimage', // Homebrew Intel, MacPorts
      '/usr/bin/scanimage', // System install (Linux)
      'scanimage', // Try PATH as fallback
    ];

    for (const scanPath of possiblePaths) {
      try {
        if (scanPath === 'scanimage') {
          // Try executing without full path (relies on PATH)
          await execAsync('which scanimage', { timeout: 2000 });
          this.scanimagePath = 'scanimage';
          return 'scanimage';
        } else {
          // Check if file exists
          if (fs.existsSync(scanPath)) {
            this.scanimagePath = scanPath;
            return scanPath;
          }
        }
      } catch (error) {
        // Continue to next path
      }
    }

    throw new Error(
      'scanimage not found. Please install SANE: brew install sane-backends',
    );
  }

  cancel(): void {
    if (this.activeProcess) {
      this.activeProcess.kill();
      this.activeProcess = null;
    }
  }

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
    const params: CommandParameter[] = [
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
    ];

    params.push({
      name: 'duplex',
      type: 'boolean',
      description:
        'Duplex scanning (both sides) — requires scanner with duplex ADF',
      required: false,
      default: false,
    });

    params.push(
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
    );

    return params;
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
      duplex,
      files,
      tempDir,
      autoSetFileName,
    } = params;

    try {
      switch (action) {
        case 'list-scanners':
          return await this.listScanners();
        case 'scan-preview':
          return await this.scanPreview(
            scannerId,
            resolution,
            multiPage !== false,
            duplex === true,
            autoSetFileName === true,
          );
        case 'finalize-scan':
          return await this.finalizeScan(
            files,
            outputPath,
            fileName,
            format,
            autoSetFileName,
          );
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
          const scanimagePath = await this.findScanimage();
          const { stdout } = await execAsync(`"${scanimagePath}" -L`);
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
          const scanimagePath = await this.findScanimage();
          const { stdout } = await execAsync(`"${scanimagePath}" -L`);
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
   * Scan on Windows using WIA - always scans in color
   */
  private async scanWindowsWIA(
    outputFile: string,
    scannerId: string,
    resolution: string,
    format: string,
    multiPage: boolean,
    duplex: boolean = false,
  ): Promise<any> {
    try {
      const dpiValue = parseInt(resolution);

      // Always scan in color (Color Intent: 1 = Color)
      const colorIntent = 1;

      // WIA's PDF output is unreliable, so we scan as JPEG and convert to PDF if needed
      const scanAsPdf = format === 'pdf';
      const actualFormat = scanAsPdf ? 'jpg' : format;
      const mimeType = actualFormat === 'jpg' ? 'image/jpeg' : 'image/png';

      // Determine output format ID
      const formatId =
        actualFormat === 'jpg'
          ? '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}' // JPEG
          : '{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}'; // PNG

      const tempOutputFile = scanAsPdf
        ? outputFile.replace(/\.pdf$/i, '.jpg')
        : outputFile;

      const scannerIdParam = scannerId ? `"${scannerId}"` : '""';
      const multiPageEnabled = multiPage ? '$true' : '$false';

      // For multi-page, we need a temp directory
      const tempDir = path.join(process.env.TEMP || '', `scan_${Date.now()}`);

      const psScript = `
$item = $null
$device = $null
$deviceManager = $null
try {
    $deviceManager = New-Object -ComObject WIA.DeviceManager
    if ($deviceManager.DeviceInfos.Count -eq 0) {
        Write-Error "No scanners found"
        exit 1
    }

    $targetScannerId = ${scannerIdParam}
    $deviceInfo = $null
    if ($targetScannerId -ne "") {
        foreach ($info in $deviceManager.DeviceInfos) {
            if ($info.DeviceID -eq $targetScannerId) {
                $deviceInfo = $info
                break
            }
        }
        if ($deviceInfo -eq $null) {
            Write-Error "Scanner with ID '$targetScannerId' not found"
            exit 1
        }
    } else {
        $deviceInfo = $deviceManager.DeviceInfos.Item(1)
    }
    Write-Host "Using scanner: $($deviceInfo.Properties.Item('Name').Value)"

    # Delay to let scanner recover from previous operation
    Start-Sleep -Milliseconds 1000

    # Retry logic for device connection with exponential backoff
    $maxRetries = 7
    $retryCount = 0
    while ($retryCount -lt $maxRetries) {
        try {
            $device = $deviceInfo.Connect()
            break
        } catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                $waitTime = 1500 * $retryCount
                Write-Host "Connection attempt $retryCount failed, retrying in $($waitTime)ms..."
                Start-Sleep -Milliseconds $waitTime
            } else {
                throw $_
            }
        }
    }
    if ($device -eq $null) { throw "Failed to connect after $maxRetries attempts" }

    $item = $device.Items.Item(1)
    $multiPageEnabled = ${multiPageEnabled}

    try {
        $item.Properties.Item("6147").Value = ${dpiValue}
        $item.Properties.Item("6148").Value = ${dpiValue}
    } catch { Write-Warning "Could not set resolution: $_" }

    try {
        $item.Properties.Item("6146").Value = ${colorIntent}
    } catch { Write-Warning "Could not set color mode: $_" }

    # Set scan area to A4 (210 x 297 mm) to avoid white space at bottom
    $a4WidthPx  = [int](210.0 / 25.4 * ${dpiValue})
    $a4HeightPx = [int](297.0 / 25.4 * ${dpiValue})
    try {
        $item.Properties.Item("6151").Value = $a4WidthPx   # WIA_IPS_XEXTENT
        $item.Properties.Item("6152").Value = $a4HeightPx  # WIA_IPS_YEXTENT
        Write-Host "Scan area set to A4 (\${a4WidthPx}x\${a4HeightPx}px)"
    } catch {
        try {
            $item.Properties.Item("3099").Value = 1  # WIA_IPS_PAGE_SIZE = WIA_PAGE_A4
            Write-Host "Page size set to A4 via WIA_IPS_PAGE_SIZE"
        } catch { Write-Warning "Could not set scan area to A4: $_" }
    }

    if (${duplex ? '$true' : '$false'}) {
        try {
            # WIA 2.0: WIA_IPS_DOCUMENT_HANDLING_SELECT (3096) — DUPLEX|FRONT_FIRST = 12
            $item.Properties.Item("3096").Value = 12
            Write-Host "Duplex mode enabled (WIA 2.0)"
        } catch {
            try {
                # WIA 1.0 fallback: WIA_DPS_DOCUMENT_HANDLING_SELECT (3088) — FEEDER|DUPLEX|FRONT_FIRST = 13
                $device.Properties.Item("3088").Value = 13
                Write-Host "Duplex mode enabled (WIA 1.0 fallback)"
            } catch {
                Write-Warning "Scanner does not support duplex via WIA; scanning single-sided"
            }
        }
    }

    $tempDir = "${tempDir.replace(/\\/g, '\\\\')}"
    if ($multiPageEnabled) {
        New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
    }

    $pageNumber = 1
    do {
        try {
            Write-Host "Scanning page $pageNumber..."
            $imageProcess = New-Object -ComObject WIA.ImageProcess
            $imageProcess.Filters.Add($imageProcess.FilterInfos.Item("Convert").FilterID)
            $imageProcess.Filters.Item(1).Properties.Item("FormatID").Value = "${formatId}"
            $image = $item.Transfer("${formatId}")
            $image = $imageProcess.Apply($image)

            if ($multiPageEnabled) {
                $outputPath = "$tempDir\\page_$pageNumber.${actualFormat}"
            } else {
                $outputPath = "${tempOutputFile.replace(/\\/g, '\\\\')}"
            }

            $image.SaveFile($outputPath)
            Write-Host "Page $pageNumber saved"
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($imageProcess) | Out-Null
            $pageNumber++

            if (-not $multiPageEnabled) { break }
            Start-Sleep -Milliseconds 500
        } catch {
            if ($_.Exception.Message -match "feeder|empty|no.*document" -or $pageNumber -gt 1) {
                Write-Host "No more pages in feeder (scanned $($pageNumber - 1) pages)"
                break
            } else {
                throw $_
            }
        }
    } while ($multiPageEnabled)

    Write-Host "Scan completed - $($pageNumber - 1) page(s)"
} catch {
    Write-Error "Scan failed: $_"
    exit 1
} finally {
    try { if ($item) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($item) | Out-Null } } catch {}
    try { if ($device) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($device) | Out-Null } } catch {}
    try { if ($deviceManager) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($deviceManager) | Out-Null } } catch {}
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    Start-Sleep -Milliseconds 1000
}
`;

      const tempScript = path.join(process.env.TEMP || '', 'scan_wia.ps1');
      fs.writeFileSync(tempScript, psScript, 'utf8');

      try {
        console.log(
          `Starting WIA scan: scanner=${scannerId || 'default'}, ${resolution}dpi, ${format}, multiPage=${multiPage}`,
        );

        const startTime = Date.now();

        if (multiPage && !fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        let fsWatcher: fs.FSWatcher | null = null;
        let pageCounter = 0;
        let firstImageProcessed = false;
        // Store callback reference to use even after fsWatcher is closed
        const progressCallbackRef = this.progressCallback;
        if (multiPage) {
          fsWatcher = fs.watch(tempDir, async (eventType, filename) => {
            if (filename && filename.endsWith(`.${actualFormat}`)) {
              const filePath = path.join(tempDir, filename);
              if (eventType === 'rename' && fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                pageCounter++;
                if (progressCallbackRef) {
                  setTimeout(async () => {
                    // Don't check fsWatcher here - we have a stored reference
                    try {
                      if (fs.existsSync(filePath)) {
                        const fileData = fs.readFileSync(filePath);
                        const base64Preview = `data:${mimeType};base64,${fileData.toString('base64')}`;
                        (progressCallbackRef as any)(
                          pageCounter,
                          filename,
                          stats.size,
                          filePath,
                          base64Preview,
                        );

                        // Perform OCR on the first image only if enabled
                        if (
                          pageCounter === 1 &&
                          !firstImageProcessed &&
                          (this as any).performOCR
                        ) {
                          firstImageProcessed = true;
                          try {
                            // Send UI feedback: OCR scan starting (only if callback exists)
                            if (progressCallbackRef) {
                              (progressCallbackRef as any)(
                                0,
                                'OCR_SCAN_START',
                                0,
                                '',
                                '',
                              );
                            }
                            console.log(
                              '[OCR] Starting OCR scan of first page...',
                            );

                            const { getOcrService } =
                              await import('./ocr-service.js');
                            const ocrService = getOcrService();
                            await ocrService.initialize();

                            // OCR and analyze the first image (PNG/JPG)
                            const { text, analysis } =
                              await ocrService.recognizeAndAnalyze(filePath);
                            console.log(
                              `[OCR] Extracted ${text.length} characters from first page`,
                            );

                            // Send UI feedback: OCR scan completed (only if callback exists)
                            if (progressCallbackRef) {
                              (progressCallbackRef as any)(
                                0,
                                'OCR_SCAN_COMPLETE',
                                text.length,
                                JSON.stringify(analysis),
                                '',
                              );
                            }
                            console.log(
                              '[OCR] OCR scan and analysis completed',
                            );
                          } catch (ocrError: any) {
                            console.warn(
                              `[OCR] OCR processing failed: ${ocrError.message}`,
                            );
                            // Send UI feedback: OCR scan failed (only if callback exists)
                            if (progressCallbackRef) {
                              (progressCallbackRef as any)(
                                0,
                                'OCR_SCAN_ERROR',
                                0,
                                ocrError.message,
                                '',
                              );
                            }
                          }
                        }
                      }
                    } catch (err) {
                      console.error('Failed to create preview:', err);
                    }
                  }, 100);
                }
              }
            }
          });
        }

        const psProcess = spawn('powershell', [
          '-ExecutionPolicy',
          'Bypass',
          '-NoProfile',
          '-File',
          tempScript,
        ]);
        this.activeProcess = psProcess;

        let stdout = '';
        let stderr = '';

        psProcess.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          output
            .split('\n')
            .filter((l: string) => l.trim())
            .forEach((l: string) => console.log(`[PS] ${l.trim()}`));
        });

        psProcess.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          output
            .split('\n')
            .filter((l: string) => l.trim())
            .forEach((l: string) => console.error(`[PS] ${l.trim()}`));
        });

        await new Promise<void>((resolve, reject) => {
          psProcess.on('close', (code) => {
            this.activeProcess = null;
            if (fsWatcher) {
              fsWatcher.close();
              fsWatcher = null; // null-out so pending 100ms timeouts skip their callback
            }

            console.log(
              `WIA scan finished in ${Date.now() - startTime}ms (exit code: ${code})`,
            );

            if (code !== 0) {
              const errorMsg =
                stderr.trim() || `PowerShell process exited with code ${code}`;
              reject(new Error(errorMsg));
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

        // Collect scanned files from filesystem
        let scanResult: any;
        if (multiPage && fs.existsSync(tempDir)) {
          const files = fs
            .readdirSync(tempDir)
            .filter((f) => f.endsWith(`.${actualFormat}`))
            .sort()
            .map((f) => path.join(tempDir, f));
          if (files.length === 0) {
            throw new Error('Scan completed but no files were created');
          }
          scanResult = {
            success: true,
            pageCount: files.length,
            files,
            tempDir,
          };
        } else if (fs.existsSync(tempOutputFile)) {
          scanResult = {
            success: true,
            pageCount: 1,
            files: [tempOutputFile],
            tempDir: '',
          };
        } else {
          throw new Error('Scan completed but no files were created');
        }

        for (const file of scanResult.files) {
          await this.recompressJpeg(file);
        }

        console.log(
          `Scanned ${scanResult.pageCount} page(s): ${scanResult.files.join(', ')}`,
        );

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
        if (fs.existsSync(tempScript)) {
          fs.unlinkSync(tempScript);
        }
        throw error;
      }
    } catch (error: any) {
      console.error('WIA scan failed:', error.message);

      let message =
        'Windows scanning failed. Make sure your scanner is connected and powered on.';
      if (error.message.includes('timeout')) {
        message =
          'Scan operation timed out. Scanner may be offline or not responding.';
      } else if (error.message.includes('No scanners found')) {
        message =
          'No scanners detected. Please check scanner connection and drivers.';
      }

      return {
        success: false,
        error: error.message,
        message,
        help:
          'Troubleshooting steps:\n' +
          '1. Check scanner is connected via USB and powered on\n' +
          '2. Install manufacturer drivers from scanner website\n' +
          '3. Test scanner in "Windows Fax and Scan" app\n' +
          '4. Check Device Manager for scanner device\n' +
          '5. Restart the WIA service: services.msc -> Windows Image Acquisition (WIA)',
      };
    }
  }

  /**
   * Scan on Unix systems (Linux/macOS) using SANE/scanimage
   */
  // Cached duplex support information so we only shell out once per process
  private duplexInfo: {
    flagSupported: boolean;
    sourceOption: string | null;
  } | null = null;

  /**
   * Detects duplex scanning support by examining scanimage help output.
   * Returns both whether --duplex flag is supported and any alternative source option.
   * This runs scanimage --help only once and caches the result.
   */
  private async detectDuplexSupport(): Promise<{
    flagSupported: boolean;
    sourceOption: string | null;
  }> {
    if (this.duplexInfo !== null) return this.duplexInfo;

    try {
      const scanimagePath = await this.findScanimage();
      const { stdout } = await execAsync(`"${scanimagePath}" --help`);
      const text = stdout.toLowerCase();

      // Check if --duplex flag is supported
      const flagSupported = stdout.includes('--duplex');

      // Check for alternative duplex source options
      let sourceOption: string | null = null;
      if (!flagSupported) {
        // Look for the most common lexical variants
        if (text.includes('adf duplex')) {
          sourceOption = 'ADF Duplex';
        } else if (text.includes('duplex')) {
          // Try to extract the quoted phrase following "--source"
          const match = stdout.match(/--source\s+"([^"]*duplex[^"]*)"/i);
          if (match && match[1]) {
            sourceOption = match[1];
          } else {
            // Fallback to generic word
            sourceOption = 'duplex';
          }
        }
      }

      this.duplexInfo = { flagSupported, sourceOption };
    } catch (e) {
      // If the command fails for any reason, assume no duplex support
      this.duplexInfo = { flagSupported: false, sourceOption: null };
    }

    return this.duplexInfo;
  }

  /**
   * Perform a simple auto‑level/normalization on the given image file.  This is
   * mainly used to brighten up the second side of a duplex scan when the backend
   * does not honour the `--duplex` flag and we fall back to a source such as
   * "ADF Duplex".  We invoke ImageMagick's `convert` if it's available and
   * otherwise silently skip the step.
   */
  private async normalizeImage(filePath: string): Promise<void> {
    try {
      // `convert` is part of ImageMagick, which is commonly installed on Unix
      // systems that also have SANE.  If the command is missing we simply ignore
      // the failure instead of throwing.
      await execAsync(`convert "${filePath}" -auto-level "${filePath}"`);
    } catch (e) {
      // ignore normalization errors
    }
  }

  private async scanUnixSANE(
    outputFile: string,
    scannerId: string,
    resolution: string,
    format: string,
    multiPage: boolean,
    duplex: boolean,
  ): Promise<any> {
    try {
      const scanAsPdf = format === 'pdf';
      const actualFormat = scanAsPdf ? 'jpg' : format;
      const mimeType = actualFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const saneFormat = actualFormat === 'jpg' ? 'jpeg' : 'png';
      const tempOutputFile = scanAsPdf
        ? outputFile.replace(/\.pdf$/i, '.jpg')
        : outputFile;
      const tempDir = path.dirname(tempOutputFile);

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const dpiValue = parseInt(resolution) || 300;
      const deviceArg = scannerId ? ['-d', scannerId] : [];

      const commonArgs = [
        `--format=${saneFormat}`,
        '--resolution',
        String(dpiValue),
        '--mode',
        'Color',
        '--page-width',
        '210', // Tell scanner A4 paper width for proper centering
        '--page-height',
        '297', // Tell scanner A4 paper height for proper centering
        '-l',
        '0', // Start scanning at left edge
        '-t',
        '0', // Start scanning at top edge
        '-x',
        '210', // Scan width: A4 width in mm
        '-y',
        '297', // Scan height: A4 height in mm
        ...deviceArg,
      ];

      // build base args list and conditionally add duplex if supported
      let scanArgs: string[];
      let fallbackUsed = false;

      if (multiPage) {
        scanArgs = [
          `--batch=${path.join(tempDir, `page_%d.${actualFormat}`)}`,
          ...commonArgs,
        ];
      } else {
        scanArgs = [...commonArgs, '-o', tempOutputFile];
      }

      if (duplex) {
        const duplexSupport = await this.detectDuplexSupport();
        if (duplexSupport.flagSupported) {
          // Use --duplex flag (preferred method)
          scanArgs.splice(multiPage ? 1 : scanArgs.length - 1, 0, '--duplex');
        } else if (duplexSupport.sourceOption) {
          // Fallback: use alternative source option like "ADF Duplex"
          scanArgs.push('--source', duplexSupport.sourceOption);
          fallbackUsed = true;
        } else {
          console.warn(
            'Duplex flag requested but scanimage does not support it; ignoring',
          );
        }
      }

      console.log(`Starting SANE scan: scanimage ${scanArgs.join(' ')}`);
      const startTime = Date.now();

      let fsWatcher: fs.FSWatcher | null = null;
      let pageCounter = 0;
      let firstImageProcessed = false;
      // Store callback reference to use even after fsWatcher is closed
      const progressCallbackRef = this.progressCallback;
      if (multiPage) {
        fsWatcher = fs.watch(tempDir, async (eventType, filename) => {
          if (filename && filename.endsWith(`.${actualFormat}`)) {
            const filePath = path.join(tempDir, filename);
            if (eventType === 'rename' && fs.existsSync(filePath)) {
              const stats = fs.statSync(filePath);
              pageCounter++;
              if (progressCallbackRef) {
                setTimeout(async () => {
                  // Don't check fsWatcher here - we have a stored reference
                  try {
                    if (fs.existsSync(filePath)) {
                      const fileData = fs.readFileSync(filePath);
                      const base64Preview = `data:${mimeType};base64,${fileData.toString('base64')}`;
                      (progressCallbackRef as any)(
                        pageCounter,
                        filename,
                        stats.size,
                        filePath,
                        base64Preview,
                      );

                      // Perform OCR on the first image only if enabled
                      if (
                        pageCounter === 1 &&
                        !firstImageProcessed &&
                        (this as any).performOCR
                      ) {
                        firstImageProcessed = true;
                        try {
                          // Send UI feedback: OCR scan starting (only if callback exists)
                          if (progressCallbackRef) {
                            (progressCallbackRef as any)(
                              0,
                              'OCR_SCAN_START',
                              0,
                              '',
                              '',
                            );
                          }
                          console.log(
                            '[OCR] Starting OCR scan of first page...',
                          );

                          const { getOcrService } =
                            await import('./ocr-service.js');
                          const ocrService = getOcrService();
                          await ocrService.initialize();

                          // OCR and analyze the first image (PNG/JPG)
                          const { text, analysis } =
                            await ocrService.recognizeAndAnalyze(filePath);
                          console.log(
                            `[OCR] Extracted ${text.length} characters from first page`,
                          );

                          // Send UI feedback: OCR scan completed (only if callback exists)
                          if (progressCallbackRef) {
                            (progressCallbackRef as any)(
                              0,
                              'OCR_SCAN_COMPLETE',
                              text.length,
                              JSON.stringify(analysis),
                              '',
                            );
                          }
                          console.log('[OCR] OCR scan and analysis completed');
                        } catch (ocrError: any) {
                          console.warn(
                            `[OCR] OCR processing failed: ${ocrError.message}`,
                          );
                          // Send UI feedback: OCR scan failed (only if callback exists)
                          if (progressCallbackRef) {
                            (progressCallbackRef as any)(
                              0,
                              'OCR_SCAN_ERROR',
                              0,
                              ocrError.message,
                              '',
                            );
                          }
                        }
                      }
                    }
                  } catch (err) {
                    console.error('Failed to create preview:', err);
                  }
                }, 100);
              }
            }
          }
        });
      }

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        lastError = null;
        try {
          await new Promise<void>(async (resolve, reject) => {
            const scanimagePath = await this.findScanimage();
            const scanProcess = spawn(scanimagePath, scanArgs);
            this.activeProcess = scanProcess;
            let stderr = '';

            scanProcess.stdout.on('data', (data) => {
              data
                .toString()
                .split('\n')
                .filter((l: string) => l.trim())
                .forEach((l: string) => console.log(`[SANE] ${l.trim()}`));
            });

            scanProcess.stderr.on('data', (data) => {
              const txt = data.toString();
              stderr += txt;
              txt
                .split('\n')
                .filter((l: string) => l.trim())
                .forEach((l: string) => console.log(`[SANE] ${l.trim()}`));
            });

            const timeout = setTimeout(() => {
              scanProcess.kill();
              reject(new Error('Scan operation timed out after 5 minutes'));
            }, 300000);

            scanProcess.on('close', (code) => {
              this.activeProcess = null;
              clearTimeout(timeout);
              // ADF empty may exit non-zero on some drivers; treat as success
              // if files were already written to disk
              const filesExist = multiPage
                ? fs
                    .readdirSync(tempDir)
                    .some((f) => f.endsWith(`.${actualFormat}`))
                : fs.existsSync(tempOutputFile);
              if (code === 0 || filesExist) {
                resolve();
              } else {
                reject(
                  new Error(
                    stderr.trim() || `scanimage exited with code ${code}`,
                  ),
                );
              }
            });

            scanProcess.on('error', (err) => {
              clearTimeout(timeout);
              reject(err);
            });
          });
          break; // success — exit retry loop
        } catch (err: any) {
          lastError = err;
          if (attempt < maxRetries) {
            console.log(
              `Scan attempt ${attempt} failed, retrying in ${attempt * 2}s...`,
            );
            await new Promise((r) => setTimeout(r, attempt * 2000));
          }
        }
      }

      if (fsWatcher) {
        fsWatcher.close();
        fsWatcher = null; // null-out so pending 100ms timeouts skip their callback
      }

      if (lastError) {
        throw lastError;
      }

      console.log(`SANE scan finished in ${Date.now() - startTime}ms`);

      // Collect files from filesystem
      let scanResult: any;
      if (multiPage && fs.existsSync(tempDir)) {
        const files = fs
          .readdirSync(tempDir)
          .filter((f) => f.endsWith(`.${actualFormat}`))
          .sort()
          .map((f) => path.join(tempDir, f));
        if (files.length === 0) {
          throw new Error('Scan completed but no files were created');
        }
        scanResult = { success: true, pageCount: files.length, files, tempDir };
      } else if (fs.existsSync(tempOutputFile)) {
        scanResult = {
          success: true,
          pageCount: 1,
          files: [tempOutputFile],
          tempDir: '',
        };
      } else {
        throw new Error('Scan completed but no files were created');
      }

      // when we fell back to a source-based duplex scan a few scanners produce
      // very dark images for the back side; applying an automatic normalization
      // helps most of them.  perform a quick post‑scan pass over every file.
      if (fallbackUsed && scanResult && scanResult.files) {
        for (const file of scanResult.files) {
          await this.normalizeImage(file);
        }
      }

      for (const file of scanResult.files) {
        await this.recompressJpeg(file);
      }

      console.log(
        `Scanned ${scanResult.pageCount} page(s): ${scanResult.files.join(', ')}`,
      );

      if (scanAsPdf) {
        await this.convertImagesToPdf(scanResult.files, outputFile);
        for (const file of scanResult.files) {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        }
        if (scanResult.tempDir && fs.existsSync(scanResult.tempDir)) {
          fs.rmdirSync(scanResult.tempDir);
        }
        const stats = fs.statSync(outputFile);
        return {
          success: true,
          outputFile,
          message: `Scanned ${scanResult.pageCount} page(s) and converted to PDF: ${outputFile}`,
          method: 'SANE + PNG-to-PDF conversion',
          pageCount: scanResult.pageCount,
          fileSize: stats.size,
        };
      } else {
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
          method: 'SANE',
          pageCount: 1,
          fileSize: stats.size,
        };
      }
    } catch (error: any) {
      console.error('SANE scan failed:', error.message);

      let message =
        'Scanning failed. Make sure your scanner is connected and SANE is installed.';
      if (error.message.includes('timeout')) {
        message =
          'Scan operation timed out. Scanner may be offline or not responding.';
      } else if (
        error.message.includes('No such device') ||
        error.message.includes('Invalid argument')
      ) {
        message =
          'Scanner not found. Check scanner connection and SANE configuration.';
      }

      return {
        success: false,
        error: error.message,
        message,
        help:
          process.platform === 'darwin'
            ? 'Install SANE: brew install sane-backends'
            : 'Install SANE: sudo apt-get install sane sane-utils',
      };
    }
  }

  /**
   * Recompress a JPEG file at the given quality (0-100) using platform-native tools.
   * Best-effort — silently skips if the tool is unavailable.
   */
  private async recompressJpeg(filePath: string, quality = 75): Promise<void> {
    const tmp = filePath + '.tmp';
    try {
      if (process.platform === 'darwin') {
        // sips is always available on macOS
        await execAsync(
          `sips -s format jpeg -s formatOptions ${quality} "${filePath}" --out "${filePath}"`,
        );
      } else if (process.platform === 'linux') {
        // ImageMagick convert — widely installed
        await execAsync(`convert -quality ${quality} "${filePath}" "${tmp}"`);
        fs.renameSync(tmp, filePath);
      } else {
        // Windows: System.Drawing via PowerShell (always available)
        const f = filePath.replace(/\\/g, '\\\\');
        const t = tmp.replace(/\\/g, '\\\\');
        const cmd = [
          'Add-Type -AssemblyName System.Drawing;',
          `$img = [System.Drawing.Image]::FromFile('${f}');`,
          `$c = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' };`,
          `$p = New-Object System.Drawing.Imaging.EncoderParameters(1);`,
          `$p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]${quality});`,
          `$img.Save('${t}', $c, $p); $img.Dispose();`,
          `Move-Item -Force '${t}' '${f}'`,
        ].join(' ');
        await execAsync(`powershell -NoProfile -Command "${cmd}"`);
      }
    } catch (err: any) {
      console.warn(
        `JPEG recompression skipped for ${path.basename(filePath)}:`,
        err.message?.split('\n')[0],
      );
      if (fs.existsSync(tmp)) {
        try {
          fs.unlinkSync(tmp);
        } catch {}
      }
    }
  }

  /**
   * Convert multiple images (PNG/JPG) to a multi-page PDF using PDFKit
   * OCR is now performed earlier, right after the first image is scanned
   */
  private async convertImagesToPdf(
    inputFiles: string[],
    outputFile: string,
    autoSetFileName: boolean = false,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!inputFiles || inputFiles.length === 0) {
          reject(new Error('No input files provided'));
          return;
        }

        console.log(
          `[PDF] Converting ${inputFiles.length} image(s) to PDF: ${outputFile}`,
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

        writeStream.on('finish', async () => {
          try {
            console.log('[PDF] PDF generated successfully');
            resolve();
          } catch (error) {
            reject(error);
          }
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
   * Scan to preview - scans pages to temp JPEGs without creating PDF (always in color)
   */
  private async scanPreview(
    scannerId: string = '',
    resolution: string = '300',
    multiPage: boolean = true,
    duplex: boolean = false,
    performOCR: boolean = false,
  ): Promise<any> {
    try {
      const tmpBase = process.env.TMPDIR || process.env.TEMP || '/tmp';
      const tempDir = path.join(tmpBase, `scan_preview_${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      const tempOutputFile = path.join(tempDir, 'page.jpg');

      // Store performOCR flag in instance variable for scanning methods to access
      (this as any).performOCR = performOCR;

      const result =
        process.platform === 'win32'
          ? await this.scanWindowsWIA(
              tempOutputFile,
              scannerId,
              resolution,
              'jpg',
              multiPage,
              duplex,
            )
          : await this.scanUnixSANE(
              tempOutputFile,
              scannerId,
              resolution,
              'jpg',
              multiPage,
              duplex,
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
          if (f.endsWith('.jpg') || f.endsWith('.jpeg')) {
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
        previews.push(`data:image/jpeg;base64,${data.toString('base64')}`);
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
    autoSetFileName: boolean = false,
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
        await this.convertImagesToPdf(fileList, outputFile, autoSetFileName);
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
