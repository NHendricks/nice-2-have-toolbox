import archiver from 'archiver';
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
  console.log('🚀 Starting manual Electron build with ASAR packaging...\n');

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
    const { execSync } = await import('child_process');
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
    const { execSync } = await import('child_process');
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

  // Copy icon.ico to resources (for window icon)
  const sourceIconPath = path.join(rootDir, 'assets', 'icons', 'icon.ico');
  const targetIconPath = path.join(outputDir, 'icon.ico');
  if (fs.existsSync(sourceIconPath)) {
    fs.copySync(sourceIconPath, targetIconPath);
    console.log('   ✅ icon.ico copied to build directory');
  } else {
    console.log('   ⚠️  icon.ico not found - run convert-icon first!');
  }

  // Step 6: Rename electron.exe
  console.log('\n🏷️  Step 6: Renaming electron.exe to nh-toolbox.exe...');
  const electronExe = path.join(outputDir, 'electron.exe');
  const xToolsExe = path.join(outputDir, 'nh-toolbox.exe');

  if (fs.existsSync(electronExe)) {
    fs.renameSync(electronExe, xToolsExe);
    console.log('   ✅ Renamed electron.exe → nh-toolbox.exe');
  } else {
    console.log('   ⚠️  electron.exe not found!');
  }

  // Step 7: Apply icon to executable
  console.log('\n🎨 Step 7: Applying icon to executable...');
  const iconPath = path.join(rootDir, 'assets', 'icons', 'icon.ico');

  if (fs.existsSync(xToolsExe) && fs.existsSync(iconPath)) {
    try {
      const { rcedit } = await import('rcedit');
      await rcedit(xToolsExe, {
        icon: iconPath,
        'version-string': {
          ProductName: 'nh-toolbox',
          FileDescription: 'N2H Toolbox',
          CompanyName: 'Nils Hendricks',
          LegalCopyright: 'Copyright © Nils Hendricks',
          OriginalFilename: 'nh-toolbox.exe',
        },
      });
      console.log('   ✅ Icon applied successfully!');
      console.log(`   🎨 Icon path used: ${iconPath}`);
    } catch (err) {
      console.log(`   ⚠️  Could not apply icon: ${err.message}`);
      console.error(err);
    }
  } else {
    if (!fs.existsSync(xToolsExe)) {
      console.log('   ⚠️  nh-toolbox.exe not found!');
    }
    if (!fs.existsSync(iconPath)) {
      console.log('   ⚠️  icon.ico not found at:', iconPath);
      console.log('   💡 Run: node convert-icon.js first');
    }
  }

  // Step 8: Create ZIP archive
  const distDir = path.join(rootDir, 'target', 'dist');
  const zipPath = path.join(distDir, 'nh-toolbox-win.zip'); // rename per OS if needed
  console.log('\n🗜️  Step 8: Creating ZIP archive...');

  // Ensure dist directory exists
  fs.mkdirSync(distDir, { recursive: true });

  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);

  // Zip the entire Electron output directory
  archive.directory(outputDir, false);

  await archive.finalize();

  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });

  const zipSize = fs.statSync(zipPath).size;
  console.log(
    `   ✅ ZIP created: ${zipPath} (${(zipSize / 1024 / 1024).toFixed(2)} MB)`,
  );

  // Summary
  console.log('\n✅ Build completed successfully!\n');
  console.log('🗜️  ZIP archive:', zipPath);
  console.log('📂 Output directory:', outputDir);
  console.log('📦 ASAR archive location:', asarPath);
  console.log('📄 version.txt location:', targetVersionFile);
  console.log('🎨 Icon file:', iconPath);
  console.log('\n🚀 Run the app:');
  console.log(`   ${path.join(outputDir, 'nh-toolbox.exe')}`);
  console.log('\n💡 Note: App packaged with ASAR for production deployment');
}

// Run the build
build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
