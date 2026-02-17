import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface';
import PDFDocument from 'pdfkit';
import sizeOf from 'image-size';

const execAsync = promisify(exec);

/**
 * Scanner Command
 * Handles scanning documents from connected scanners/printers
 */
export class ScannerCommand implements ICommand {
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
        name: 'resolution',
        type: 'select',
        description: 'Scan resolution (DPI)',
        required: false,
        options: ['150', '300', '600'],
        default: '300',
      },
      {
        name: 'colorMode',
        type: 'select',
        description: 'Color mode',
        required: false,
        options: ['color', 'grayscale', 'lineart'],
        default: 'color',
      },
      {
        name: 'format',
        type: 'select',
        description: 'Output format',
        required: false,
        options: ['pdf', 'png', 'jpg'],
        default: 'pdf',
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
      colorMode,
      format,
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
            colorMode,
            format,
          );
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
    colorMode: string = 'color',
    format: string = 'pdf',
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
        // Windows scanning using PowerShell and WIA
        return await this.scanWindowsWIA(
          outputFile,
          scannerId,
          resolution,
          colorMode,
          format,
        );
      } else {
        // Unix-like systems (macOS, Linux) using scanimage
        return await this.scanUnixSANE(
          outputFile,
          scannerId,
          resolution,
          colorMode,
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
   * Scan on Windows using WIA
   */
  private async scanWindowsWIA(
    outputFile: string,
    scannerId: string,
    resolution: string,
    colorMode: string,
    format: string,
  ): Promise<any> {
    try {
      // Improved PowerShell script for WIA scanning
      const dpiValue = parseInt(resolution);

      // Color Intent: 1 = Color, 2 = Grayscale, 4 = Black & White
      const colorIntent =
        colorMode === 'color' ? 1 : colorMode === 'grayscale' ? 2 : 4;

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
      const psScript = `
try {
    # Create WIA DeviceManager
    $deviceManager = New-Object -ComObject WIA.DeviceManager

    # Get scanner by ID or use first available
    if ($deviceManager.DeviceInfos.Count -eq 0) {
        Write-Error "No scanners found"
        exit 1
    }

    $targetScannerId = ${scannerIdParam}
    $deviceInfo = $null

    if ($targetScannerId -ne "") {
        # Find scanner by Device ID
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
        $deviceInfo = $deviceManager.DeviceInfos.Item(1)
        Write-Host "Using default scanner: $($deviceInfo.Properties.Item('Name').Value)"
    }

    $device = $deviceInfo.Connect()
    
    # Get scanner item (usually Item 1)
    $item = $device.Items.Item(1)
    
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
    
    # Perform the scan
    Write-Host "Starting scan..."
    $imageProcess = New-Object -ComObject WIA.ImageProcess
    $imageProcess.Filters.Add($imageProcess.FilterInfos.Item("Convert").FilterID)
    $imageProcess.Filters.Item(1).Properties.Item("FormatID").Value = "${formatId}"
    
    # Transfer image from scanner
    $image = $item.Transfer("${formatId}")

    # Process and save
    $image = $imageProcess.Apply($image)
    $image.SaveFile("${tempOutputFile.replace(/\\/g, '\\\\')}")

    Write-Host "Scan completed successfully"
    exit 0
    
} catch {
    Write-Error "Scan failed: $_"
    Write-Error $_.Exception.Message
    exit 1
}
`;

      const tempScript = path.join(process.env.TEMP || '', 'scan_wia.ps1');
      fs.writeFileSync(tempScript, psScript, 'utf8');

      try {
        console.log('Starting WIA scan...');
        const { stdout, stderr } = await execAsync(
          `powershell -ExecutionPolicy Bypass -NoProfile -File "${tempScript}"`,
          { timeout: 120000 }, // 2 minute timeout
        );
        console.log('WIA scan completed');

        // Clean up
        if (fs.existsSync(tempScript)) {
          fs.unlinkSync(tempScript);
        }

        // Check if file was created and has reasonable size
        if (fs.existsSync(tempOutputFile)) {
          // If we need to convert PNG to PDF
          if (scanAsPdf) {
            try {
              console.log('Converting PNG to PDF...');
              await this.convertImageToPdf(tempOutputFile, outputFile);

              // Clean up temporary PNG file
              if (fs.existsSync(tempOutputFile)) {
                fs.unlinkSync(tempOutputFile);
              }

              const stats = fs.statSync(outputFile);
              return {
                success: true,
                outputFile,
                message: `Document scanned and converted to PDF successfully: ${outputFile}`,
                method: 'WIA + PNG-to-PDF conversion',
                fileSize: stats.size,
                stdout: stdout,
              };
            } catch (conversionError: any) {
              // If conversion fails, keep the PNG
              console.error('PDF conversion failed:', conversionError.message);
              return {
                success: true,
                outputFile: tempOutputFile,
                message: `Document scanned as PNG (PDF conversion failed): ${tempOutputFile}`,
                method: 'WIA',
                fileSize: fs.statSync(tempOutputFile).size,
                warning:
                  'Could not convert to PDF. Saved as PNG instead. Error: ' +
                  conversionError.message,
              };
            }
          } else {
            // Not converting, just return the scanned file
            const stats = fs.statSync(outputFile);
            return {
              success: true,
              outputFile,
              message: `Document scanned successfully to ${outputFile}`,
              method: 'WIA',
              fileSize: stats.size,
              stdout: stdout,
            };
          }
        } else {
          throw new Error('Scan completed but file was not created');
        }
      } catch (error: any) {
        // Clean up on error
        if (fs.existsSync(tempScript)) {
          fs.unlinkSync(tempScript);
        }
        throw error;
      }
    } catch (error: any) {
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
      } else if (error.message.includes('No scanners found')) {
        errorDetails.message =
          'No scanners detected. Please check scanner connection and drivers.';
      }

      return errorDetails;
    }
  }

  /**
   * Convert an image (PNG/JPG) to PDF using PDFKit
   */
  private async convertImageToPdf(
    inputFile: string,
    outputFile: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Get image dimensions
        const imageBuffer = fs.readFileSync(inputFile);
        const dimensions = sizeOf(imageBuffer);

        // Create PDF with page size matching the image
        const doc = new PDFDocument({
          size: [dimensions.width, dimensions.height],
          margin: 0,
        });

        // Pipe to file
        const writeStream = fs.createWriteStream(outputFile);
        doc.pipe(writeStream);

        // Add the image to fill the entire page
        doc.image(inputFile, 0, 0, {
          width: dimensions.width,
          height: dimensions.height,
        });

        // Finalize the PDF
        doc.end();

        writeStream.on('finish', () => {
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
   * Scan on Unix systems using SANE/scanimage
   */
  private async scanUnixSANE(
    outputFile: string,
    scannerId: string,
    resolution: string,
    colorMode: string,
    format: string,
  ): Promise<any> {
    try {
      const mode =
        colorMode === 'color'
          ? 'Color'
          : colorMode === 'grayscale'
            ? 'Gray'
            : 'Lineart';
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
