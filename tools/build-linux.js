import archiver from 'archiver';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const rootDir = path.resolve(__dirname, '..');
const electronDistPath = path.join(
  rootDir,
  'process',
  'node_modules',
  'electron',
  'dist',
);
const outputDir = path.join(rootDir, 'target/build-output');
const appDir = path.join(rootDir, 'target/app-content');
const versionFile = path.join(rootDir, 'version', 'version.txt');

async function build() {
  console.log(
    '🚀 Starting manual Electron build for Linux with ASAR packaging...\n',
  );

  // Step 1: Clean and prepare directories
  console.log('📁 Step 1: Preparing directories...');

  // Clean app-content
  if (fs.existsSync(appDir)) {
    try {
      fs.removeSync(appDir);
      console.log('   ✅ Cleaned app-content directory');
    } catch (err) {
      console.log(`   ⚠️  Could not clean app-content: ${err.message}`);
    }
  }
  fs.mkdirSync(appDir, { recursive: true });

  // Try to clean build-output, but continue if it fails
  if (fs.existsSync(outputDir)) {
    try {
      fs.removeSync(outputDir);
      console.log('   ✅ Cleaned build-output directory');
    } catch (err) {
      console.log(
        `   ⚠️  Could not fully clean build-output (files might be in use)`,
      );
      console.log(
        '   💡 Tip: Close Electron app and retry, or manually delete build-output',
      );
    }
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // Step 2: Copy Electron distribution
  console.log('📦 Step 2: Copying Electron from node_modules...');
  fs.copySync(electronDistPath, outputDir);
  console.log(`   ✅ Copied from: ${electronDistPath}`);
  console.log(`   ✅ To: ${outputDir}`);

  // Step 3: Prepare app content
  console.log('\n📋 Step 3: Preparing app content...');

  // Copy backend
  const backendDist = path.join(rootDir, 'backend', 'dist');
  const appBackend = path.join(appDir, 'backend', 'dist');
  if (fs.existsSync(backendDist)) {
    fs.copySync(backendDist, appBackend);
    console.log('   ✅ Backend copied');
  } else {
    console.log('   ⚠️  Backend dist not found - run buildBackend first!');
  }

  // Copy backend package.json and install production dependencies
  const backendPackageJson = path.join(rootDir, 'backend', 'package.json');
  const appBackendPackageJson = path.join(appDir, 'backend', 'package.json');

  if (fs.existsSync(backendPackageJson)) {
    fs.copySync(backendPackageJson, appBackendPackageJson);
    console.log('   ✅ Backend package.json copied');

    console.log('   📦 Installing backend production dependencies...');
    try {
      execSync('npm install --production --no-audit --no-fund', {
        cwd: path.join(appDir, 'backend'),
        stdio: 'inherit',
      });
      console.log('   ✅ Backend production dependencies installed');
    } catch (err) {
      console.log(
        `   ⚠️  Failed to install backend dependencies: ${err.message}`,
      );
    }
  }

  // Copy process
  const processDist = path.join(rootDir, 'process', 'dist');
  const appProcess = path.join(appDir, 'process', 'dist');
  if (fs.existsSync(processDist)) {
    fs.copySync(processDist, appProcess);
    console.log('   ✅ Process copied');
  } else {
    console.log('   ⚠️  Process dist not found - run buildProcess first!');
  }

  // Copy process package.json and install production dependencies
  const processPackageJson = path.join(rootDir, 'process', 'package.json');
  const appProcessPackageJson = path.join(appDir, 'process', 'package.json');

  if (fs.existsSync(processPackageJson)) {
    fs.copySync(processPackageJson, appProcessPackageJson);
    console.log('   ✅ Process package.json copied');

    console.log('   📦 Installing process production dependencies...');
    try {
      execSync('npm install --production --no-audit --no-fund', {
        cwd: path.join(appDir, 'process'),
        stdio: 'inherit',
      });
      console.log('   ✅ Process production dependencies installed');
    } catch (err) {
      console.log(
        `   ⚠️  Failed to install process dependencies: ${err.message}`,
      );
    }
  }

  // Copy UI
  const uiDist = path.join(rootDir, 'ui', 'dist');
  const appUi = path.join(appDir, 'ui', 'dist');
  if (fs.existsSync(uiDist)) {
    fs.copySync(uiDist, appUi);
    console.log('   ✅ UI copied');
  } else {
    console.log('   ⚠️  UI dist not found - run buildUI first!');
  }

  // Copy package.json
  const packageJson = path.join(rootDir, 'package.json');
  const appPackageJson = path.join(appDir, 'package.json');
  fs.copySync(packageJson, appPackageJson);
  console.log('   ✅ package.json copied');

  // Step 4: Create ASAR archive
  console.log('\n📦 Step 4: Creating ASAR archive...');
  const resourcesDir = path.join(outputDir, 'resources');
  const asarPath = path.join(resourcesDir, 'app.asar');

  // Remove old app folder if exists
  const oldAppFolder = path.join(resourcesDir, 'app');
  if (fs.existsSync(oldAppFolder)) {
    fs.removeSync(oldAppFolder);
    console.log('   🗑️  Removed old app folder');
  }

  // Remove old app.asar if exists
  if (fs.existsSync(asarPath)) {
    fs.removeSync(asarPath);
    console.log('   🗑️  Removed old app.asar');
  }

  // Create ASAR archive
  try {
    const asar = await import('@electron/asar');
    await asar.createPackage(appDir, asarPath);
    console.log('   ✅ ASAR archive created successfully!');

    // Calculate ASAR size
    const asarSize = fs.statSync(asarPath).size;
    console.log(`   📊 ASAR Size: ${(asarSize / 1024 / 1024).toFixed(2)} MB`);
  } catch (err) {
    console.log(`   ❌ Failed to create ASAR: ${err.message}`);
    throw err;
  }

  // Step 5: Copy version.txt, licenses, and icon to resources
  console.log(
    '\n📄 Step 5: Copying version.txt, licenses, and icon to resources...',
  );
  const targetVersionFile = path.join(resourcesDir, 'version.txt');

  if (fs.existsSync(versionFile)) {
    fs.copySync(versionFile, targetVersionFile);
    const version = fs.readFileSync(versionFile, 'utf8').trim();
    console.log(`   ✅ version.txt copied (Version: ${version})`);
  } else {
    console.log('   ⚠️  version.txt not found!');
  }

  // Copy LICENSE
  const licenseFile = path.join(rootDir, 'LICENSE');
  const targetLicenseFile = path.join(resourcesDir, 'LICENSE');
  if (fs.existsSync(licenseFile)) {
    fs.copySync(licenseFile, targetLicenseFile);
    console.log('   ✅ LICENSE copied');
  } else {
    console.log('   ⚠️  LICENSE not found!');
  }

  // Copy THIRD_PARTY_LICENSES.txt
  const thirdPartyLicenseFile = path.join(rootDir, 'THIRD_PARTY_LICENSES.txt');
  const targetThirdPartyLicenseFile = path.join(
    resourcesDir,
    'THIRD_PARTY_LICENSES.txt',
  );
  if (fs.existsSync(thirdPartyLicenseFile)) {
    fs.copySync(thirdPartyLicenseFile, targetThirdPartyLicenseFile);
    console.log('   ✅ THIRD_PARTY_LICENSES.txt copied');
  } else {
    console.log('   ⚠️  THIRD_PARTY_LICENSES.txt not found!');
  }

  // Copy icon-256.png as icon.png to output directory (for Linux desktop integration)
  const sourceIconPath = path.join(rootDir, 'assets', 'icons', 'icon-256.png');
  const targetIconPath = path.join(outputDir, 'icon.png');
  if (fs.existsSync(sourceIconPath)) {
    fs.copySync(sourceIconPath, targetIconPath);
    console.log('   ✅ icon-256.png copied as icon.png to build directory');

    // Also copy to resources folder for BrowserWindow icon
    const resourcesIconPath = path.join(resourcesDir, 'icon.png');
    fs.copySync(sourceIconPath, resourcesIconPath);
    console.log('   ✅ icon.png also copied to resources directory');
  } else {
    console.log('   ⚠️  icon-256.png not found at assets/icons/icon-256.png');
  }

  // Step 6: Rename electron binary
  console.log('\n🏷️  Step 6: Renaming electron binary to nh-toolbox...');
  const electronBinary = path.join(outputDir, 'electron');
  const nhToolboxBinary = path.join(outputDir, 'nh-toolbox');

  if (fs.existsSync(electronBinary)) {
    fs.renameSync(electronBinary, nhToolboxBinary);
    console.log('   ✅ Renamed electron → nh-toolbox');

    // Make sure it's executable
    try {
      fs.chmodSync(nhToolboxBinary, 0o755);
      console.log('   ✅ Set executable permissions');
    } catch (err) {
      console.log(`   ⚠️  Could not set permissions: ${err.message}`);
    }
  } else {
    console.log('   ⚠️  electron binary not found!');
  }

  // Step 7: Create .desktop file for Linux desktop integration
  console.log('\n📝 Step 7: Creating .desktop file...');
  const desktopFileContent = `[Desktop Entry]
Name=nh-toolbox
Comment=Utility app by Nils Hendricks
Exec=nh-toolbox
Icon=icon
Type=Application
Categories=Utility;
Terminal=false
StartupWMClass=nh-toolbox
`;
  const desktopFilePath = path.join(outputDir, 'nh-toolbox.desktop');
  fs.writeFileSync(desktopFilePath, desktopFileContent, 'utf8');
  console.log('   ✅ nh-toolbox.desktop created');

  // Step 8: Create install script
  console.log('\n📝 Step 8: Creating install script...');
  const installScript = `#!/bin/bash
# nh-toolbox Linux Install Script
# Run with: sudo ./install.sh

INSTALL_DIR="/opt/nh-toolbox"
DESKTOP_FILE="/usr/share/applications/nh-toolbox.desktop"
BIN_LINK="/usr/local/bin/nh-toolbox"

echo "Installing nh-toolbox..."

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Copy all files
cp -r ./* "$INSTALL_DIR/"

# Create symlink to binary
ln -sf "$INSTALL_DIR/nh-toolbox" "$BIN_LINK"

# Install desktop file with correct paths
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=nh-toolbox
Comment=Utility app by Nils Hendricks
Exec=$INSTALL_DIR/nh-toolbox
Icon=$INSTALL_DIR/icon.png
Type=Application
Categories=Utility;
Terminal=false
StartupWMClass=nh-toolbox
EOF

# Set permissions
chmod +x "$INSTALL_DIR/nh-toolbox"
chmod 644 "$DESKTOP_FILE"

echo "✅ nh-toolbox installed successfully!"
echo "   Run from terminal: nh-toolbox"
echo "   Or find it in your application menu"
`;
  const installScriptPath = path.join(outputDir, 'install.sh');
  fs.writeFileSync(installScriptPath, installScript, 'utf8');
  fs.chmodSync(installScriptPath, 0o755);
  console.log('   ✅ install.sh created');

  // Step 9: Create uninstall script
  console.log('\n📝 Step 9: Creating uninstall script...');
  const uninstallScript = `#!/bin/bash
# nh-toolbox Linux Uninstall Script
# Run with: sudo ./uninstall.sh

INSTALL_DIR="/opt/nh-toolbox"
DESKTOP_FILE="/usr/share/applications/nh-toolbox.desktop"
BIN_LINK="/usr/local/bin/nh-toolbox"

echo "Uninstalling nh-toolbox..."

# Remove symlink
rm -f "$BIN_LINK"

# Remove desktop file
rm -f "$DESKTOP_FILE"

# Remove installation directory
rm -rf "$INSTALL_DIR"

echo "✅ nh-toolbox uninstalled successfully!"
`;
  const uninstallScriptPath = path.join(outputDir, 'uninstall.sh');
  fs.writeFileSync(uninstallScriptPath, uninstallScript, 'utf8');
  fs.chmodSync(uninstallScriptPath, 0o755);
  console.log('   ✅ uninstall.sh created');

  // Step 10: Create tar.gz archive (preferred format for Linux)
  const distDir = path.join(rootDir, 'target', 'dist');
  const arch = process.env.ELECTRON_ARCH || process.arch;
  const tarPath = path.join(distDir, `nh-toolbox-linux-${arch}.tar.gz`);
  console.log('\n🗜️  Step 10: Creating tar.gz archive...');

  // Ensure dist directory exists
  fs.mkdirSync(distDir, { recursive: true });

  const output = fs.createWriteStream(tarPath);
  const archive = archiver('tar', { gzip: true, gzipOptions: { level: 9 } });

  archive.pipe(output);

  // Add all files from outputDir, placing them inside nh-toolbox folder
  archive.directory(outputDir, 'nh-toolbox');

  await archive.finalize();

  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });

  const tarSize = fs.statSync(tarPath).size;
  console.log(
    `   ✅ tar.gz created: ${tarPath} (${(tarSize / 1024 / 1024).toFixed(2)} MB)`,
  );

  // Summary
  console.log('\n✅ Build completed successfully!\n');
  console.log('🗜️  Archive:', tarPath);
  console.log('📂 Output directory:', outputDir);
  console.log('📦 ASAR archive location:', asarPath);
  console.log('📄 version.txt location:', targetVersionFile);
  console.log('\n🚀 To install on Linux:');
  console.log(`   1. Extract: tar -xzf nh-toolbox-linux-${arch}.tar.gz`);
  console.log('   2. cd nh-toolbox');
  console.log('   3. sudo ./install.sh');
  console.log('\n💡 Or run directly:');
  console.log(`   cd nh-toolbox && ./nh-toolbox`);
  console.log('\n📝 Note: App packaged with ASAR for production deployment');
}

// Run the build
build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
