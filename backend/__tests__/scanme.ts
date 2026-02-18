import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Scan Test mit WIA für CANON DR-M140 USB
 *
 * Dieses Script führt einen WIA-Scan mit dem CANON DR-M140 USB Scanner durch.
 */

async function scanWithCanonDRM140() {
  console.log('=== CANON DR-M140 USB Scan Test ===\n');

  try {
    // 1. Verfügbare Scanner auflisten
    console.log('1. Suche nach verfügbaren Scannern...');
    const scanners = await listScanners();

    if (!scanners || scanners.length === 0) {
      console.error('❌ Keine Scanner gefunden!');
      console.log('\nTroubleshooting:');
      console.log('- Scanner eingeschaltet?');
      console.log('- USB-Kabel verbunden?');
      console.log('- Treiber installiert?');
      console.log('- Scanner in "Windows Fax and Scan" sichtbar?');
      return;
    }

    console.log(`✓ ${scanners.length} Scanner gefunden:\n`);
    scanners.forEach((scanner, index) => {
      console.log(`  ${index + 1}. ${scanner.name}`);
      console.log(`     ID: ${scanner.id}`);
      console.log(`     Manufacturer: ${scanner.manufacturer || 'N/A'}`);
      console.log('');
    });

    // 2. CANON DR-M140 Scanner finden
    console.log('2. Suche nach CANON DR-M140 USB Scanner...');
    const canonScanner = scanners.find(
      (s) =>
        s.name.toUpperCase().includes('CANON') &&
        s.name.toUpperCase().includes('DR-M140'),
    );

    if (!canonScanner) {
      console.error('❌ CANON DR-M140 Scanner nicht gefunden!');
      console.log('\nVerfügbare Scanner:');
      scanners.forEach((s) => console.log(`  - ${s.name}`));
      console.log('\nBitte prüfen Sie:');
      console.log('- Ist der CANON DR-M140 angeschlossen?');
      console.log('- Sind die richtigen Treiber installiert?');
      return;
    }

    console.log(`✓ Scanner gefunden: ${canonScanner.name}`);
    console.log(`  Device ID: ${canonScanner.id}\n`);

    // 3. Output-Verzeichnis erstellen
    const outputDir = path.join(
      process.env.USERPROFILE || '',
      'Documents',
      'Scans',
      'TestScans',
    );

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✓ Output-Verzeichnis erstellt: ${outputDir}\n`);
    }

    // 4. Scan durchführen
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const outputFile = path.join(outputDir, `canon_scan_${timestamp}.pdf`);

    console.log('3. Starte Scan-Vorgang...');
    console.log(`   Scanner: ${canonScanner.name}`);
    console.log(`   Output: ${outputFile}`);
    console.log(`   Resolution: 300 DPI`);
    console.log(`   Color Mode: Color`);
    console.log(`   Format: PDF`);
    console.log(`   Multi-Page: Ja`);
    console.log('');
    console.log('⏳ Bitte warten, Scanner wird initialisiert...\n');

    const scanResult = await performScan(
      canonScanner.id,
      outputFile,
      300, // resolution (DPI)
      'color', // colorMode
      true, // multiPage
      false, // duplex (für Test deaktiviert)
    );

    if (scanResult.success) {
      console.log('\n✅ Scan erfolgreich abgeschlossen!');
      console.log(`   Datei: ${scanResult.outputFile}`);
      if (scanResult.pageCount) {
        console.log(`   Seiten: ${scanResult.pageCount}`);
      }
      if (scanResult.fileSize) {
        const sizeMB = (scanResult.fileSize / 1024 / 1024).toFixed(2);
        console.log(`   Größe: ${sizeMB} MB`);
      }
      console.log('\n📄 Scanned document can be found at:');
      console.log(`   ${scanResult.outputFile}`);

      // Optional: Datei öffnen
      console.log('\n💡 To open the file, run:');
      console.log(`   start "" "${scanResult.outputFile}"`);
    } else {
      console.error('\n❌ Scan fehlgeschlagen!');
      console.error(`   Fehler: ${scanResult.error}`);
      if (scanResult.debugOutput) {
        console.log('\n=== Debug Output ===');
        console.log(scanResult.debugOutput);
      }
    }
  } catch (error: any) {
    console.error('\n❌ Fehler beim Scan:', error.message);
    console.error(error.stack);
  }
}

/**
 * Listet alle verfügbaren WIA-Scanner auf
 */
async function listScanners(): Promise<any[]> {
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

  const tempScript = path.join(process.env.TEMP || '', 'list_scanners.ps1');
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
      throw new Error(stdout);
    }

    const trimmedOutput = stdout.trim();
    if (!trimmedOutput || trimmedOutput === '[]') {
      return [];
    }

    let scannerData = JSON.parse(trimmedOutput);
    if (!Array.isArray(scannerData)) {
      scannerData = [scannerData];
    }

    return scannerData.map((s: any) => ({
      id: s.DeviceID || 'unknown',
      name: s.Name || 'Unknown Scanner',
      manufacturer: s.Manufacturer || '',
      description: s.Description || '',
    }));
  } catch (error: any) {
    if (fs.existsSync(tempScript)) {
      fs.unlinkSync(tempScript);
    }
    throw error;
  }
}

/**
 * Führt einen WIA-Scan durch
 */
async function performScan(
  scannerId: string,
  outputFile: string,
  resolution: number = 300,
  colorMode: string = 'color',
  multiPage: boolean = true,
  duplex: boolean = false,
): Promise<any> {
  const colorIntent =
    colorMode === 'color' ? 1 : colorMode === 'grayscale' ? 2 : 4;
  const formatId = '{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}'; // PNG

  const tempDir = path.join(process.env.TEMP || '', `scan_${Date.now()}`);
  const tempOutputFile = outputFile.replace(/\.pdf$/i, '.png');

  const psScript = `
$ErrorActionPreference = 'Stop'
try {
    Write-Host "Connecting to scanner..."
    $deviceManager = New-Object -ComObject WIA.DeviceManager
    
    # Find scanner by Device ID
    $deviceInfo = $null
    foreach ($info in $deviceManager.DeviceInfos) {
        if ($info.DeviceID -eq "${scannerId}") {
            $deviceInfo = $info
            Write-Host "Found scanner: $($info.Properties.Item('Name').Value)"
            break
        }
    }
    
    if ($deviceInfo -eq $null) {
        Write-Error "Scanner not found"
        exit 1
    }
    
    Write-Host "Connecting to device..."
    $device = $deviceInfo.Connect()
    $item = $device.Items.Item(1)
    
    Write-Host "Configuring scan settings..."
    # Set resolution
    try {
        $item.Properties.Item("6147").Value = ${resolution}
        $item.Properties.Item("6148").Value = ${resolution}
    } catch {
        Write-Warning "Could not set resolution: $_"
    }
    
    # Set color mode
    try {
        $item.Properties.Item("6146").Value = ${colorIntent}
    } catch {
        Write-Warning "Could not set color mode: $_"
    }
    
    # Create temp directory for multi-page scans
    $tempDir = "${tempDir.replace(/\\/g, '\\\\')}"
    if (${multiPage ? '$true' : '$false'}) {
        New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
    }
    
    # Scan loop
    $pageNumber = 1
    $scannedFiles = @()
    
    do {
        try {
            Write-Host "Scanning page $pageNumber..."
            
            # Create image process
            $imageProcess = New-Object -ComObject WIA.ImageProcess
            $imageProcess.Filters.Add($imageProcess.FilterInfos.Item("Convert").FilterID)
            $imageProcess.Filters.Item(1).Properties.Item("FormatID").Value = "${formatId}"
            
            # Transfer image
            $image = $item.Transfer("${formatId}")
            $image = $imageProcess.Apply($image)
            
            # Save image
            if (${multiPage ? '$true' : '$false'}) {
                $outputPath = "$tempDir\\page_$pageNumber.png"
            } else {
                $outputPath = "${tempOutputFile.replace(/\\/g, '\\\\')}"
            }
            
            $image.SaveFile($outputPath)
            $scannedFiles += $outputPath
            Write-Host "Page $pageNumber saved"
            
            $pageNumber++
            
            if (-not ${multiPage ? '$true' : '$false'}) {
                break
            }
            
            Start-Sleep -Milliseconds 500
            
        } catch {
            if ($_.Exception.Message -match "feeder|empty|no.*document" -or $pageNumber -gt 1) {
                Write-Host "No more pages (scanned $($pageNumber - 1) pages)"
                break
            } else {
                throw $_
            }
        }
    } while (${multiPage ? '$true' : '$false'})
    
    # Return result
    $result = @{
        success = $true
        pageCount = $scannedFiles.Count
        files = $scannedFiles
        tempDir = if (${multiPage ? '$true' : '$false'}) { $tempDir } else { "" }
    }
    
    $result | ConvertTo-Json -Compress
    exit 0
    
} catch {
    Write-Error "Scan failed: $($_.Exception.Message)"
    exit 1
}
`;

  const tempScript = path.join(process.env.TEMP || '', 'scan_canon.ps1');
  fs.writeFileSync(tempScript, psScript, 'utf8');

  try {
    const { stdout, stderr } = await execAsync(
      `powershell -ExecutionPolicy Bypass -NoProfile -File "${tempScript}"`,
      { timeout: 300000 }, // 5 Minuten
    );

    if (fs.existsSync(tempScript)) {
      fs.unlinkSync(tempScript);
    }

    // Parse JSON result
    const lines = stdout.split('\n');
    let scanResult: any = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{')) {
        try {
          scanResult = JSON.parse(trimmed);
          break;
        } catch (e) {
          // Not JSON
        }
      }
    }

    if (!scanResult || !scanResult.files || scanResult.files.length === 0) {
      // Fallback
      if (fs.existsSync(tempOutputFile)) {
        scanResult = {
          success: true,
          pageCount: 1,
          files: [tempOutputFile],
          tempDir: '',
        };
      } else {
        throw new Error('No files were created');
      }
    }

    // Convert images to PDF
    if (scanResult.files.length > 0 && outputFile.endsWith('.pdf')) {
      console.log(
        `\nKonvertiere ${scanResult.files.length} Seite(n) zu PDF...`,
      );

      // Import PDFKit dynamically
      const PDFDocument = (await import('pdfkit')).default;
      const sizeOf = (await import('image-size')).default;

      await new Promise<void>((resolve, reject) => {
        try {
          // Get dimensions of first image
          const firstImageBuffer = fs.readFileSync(scanResult.files[0]);
          const firstDimensions = sizeOf(firstImageBuffer);

          // Create PDF
          const doc = new PDFDocument({
            size: [firstDimensions.width || 612, firstDimensions.height || 792],
            margin: 0,
            autoFirstPage: false,
          });

          const writeStream = fs.createWriteStream(outputFile);
          doc.pipe(writeStream);

          // Add each image as a page
          for (let i = 0; i < scanResult.files.length; i++) {
            const inputFile = scanResult.files[i];
            console.log(
              `  Seite ${i + 1}/${scanResult.files.length}: ${path.basename(inputFile)}`,
            );

            const imageBuffer = fs.readFileSync(inputFile);
            const dimensions = sizeOf(imageBuffer);

            if (!dimensions.width || !dimensions.height) {
              doc.addPage();
            } else {
              doc.addPage({
                size: [dimensions.width, dimensions.height],
                margin: 0,
              });
            }

            doc.image(inputFile, 0, 0, {
              width: dimensions.width || doc.page.width,
              height: dimensions.height || doc.page.height,
            });
          }

          doc.end();

          writeStream.on('finish', () => {
            console.log('✓ PDF erfolgreich erstellt');

            // Clean up temp files
            for (const file of scanResult.files) {
              if (fs.existsSync(file)) {
                fs.unlinkSync(file);
              }
            }

            // Clean up temp directory
            if (scanResult.tempDir && fs.existsSync(scanResult.tempDir)) {
              fs.rmdirSync(scanResult.tempDir);
            }

            resolve();
          });

          writeStream.on('error', (error) => {
            reject(new Error(`PDF creation failed: ${error.message}`));
          });
        } catch (error: any) {
          reject(new Error(`PDF conversion failed: ${error.message}`));
        }
      });

      const stats = fs.statSync(outputFile);
      return {
        success: true,
        outputFile,
        pageCount: scanResult.pageCount,
        fileSize: stats.size,
        debugOutput: stdout + (stderr ? '\n\n' + stderr : ''),
      };
    } else if (scanResult.files.length > 0) {
      // Not PDF format, just return first file
      const firstFile = scanResult.files[0];
      if (firstFile !== outputFile && !outputFile.endsWith('.pdf')) {
        fs.copyFileSync(firstFile, outputFile);
      }

      const stats = fs.existsSync(outputFile)
        ? fs.statSync(outputFile)
        : fs.statSync(firstFile);

      return {
        success: true,
        outputFile: fs.existsSync(outputFile) ? outputFile : firstFile,
        pageCount: scanResult.pageCount,
        fileSize: stats.size,
        debugOutput: stdout + (stderr ? '\n\n' + stderr : ''),
      };
    }

    return {
      success: false,
      error: 'No pages scanned',
      debugOutput: stdout,
    };
  } catch (error: any) {
    if (fs.existsSync(tempScript)) {
      fs.unlinkSync(tempScript);
    }
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
    };
  }
}

// Script ausführen wenn direkt aufgerufen
const isMainModule =
  process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMainModule) {
  scanWithCanonDRM140().catch(console.error);
}

export { listScanners, performScan, scanWithCanonDRM140 };
