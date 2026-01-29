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

console.log(
  '🚀 Starting manual Electron build for Mac with ASAR packaging...\n',
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

// Copy ^d
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
// On Mac, the resources directory is inside the app bundle
const electronAppPath = path.join(outputDir, 'Electron.app');
const resourcesDir = path.join(electronAppPath, 'Contents', 'Resources');
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

// Step 5: Rename Electron.app to nh-toolbox.app (do this before version.txt)
console.log('\n🏷️  Step 5: Renaming Electron.app to nh-toolbox.app...');
const nhToolsAppPath = path.join(outputDir, 'nh-toolbox.app');

if (fs.existsSync(electronAppPath)) {
  fs.renameSync(electronAppPath, nhToolsAppPath);
  console.log('   ✅ Renamed Electron.app → nh-toolbox.app');
} else {
  console.log('   ⚠️  Electron.app not found!');
}

// Step 6: Copy version.txt and licenses
console.log('\n📄 Step 6: Copying version.txt and licenses...');
const targetResourcesDir = path.join(nhToolsAppPath, 'Contents', 'Resources');
const targetVersionFile = path.join(targetResourcesDir, 'version.txt');

if (fs.existsSync(versionFile)) {
  fs.copySync(versionFile, targetVersionFile);
  console.log('   ✅ version.txt copied to Resources');
} else {
  console.log('   ⚠️  version.txt not found at source!');
}

// Copy LICENSE
const licenseFile = path.join(rootDir, 'LICENSE');
const targetLicenseFile = path.join(targetResourcesDir, 'LICENSE');
if (fs.existsSync(licenseFile)) {
  fs.copySync(licenseFile, targetLicenseFile);
  console.log('   ✅ LICENSE copied to Resources');
} else {
  console.log('   ⚠️  LICENSE not found!');
}

// Copy THIRD_PARTY_LICENSES.txt
const thirdPartyLicenseFile = path.join(rootDir, 'THIRD_PARTY_LICENSES.txt');
const targetThirdPartyLicenseFile = path.join(
  targetResourcesDir,
  'THIRD_PARTY_LICENSES.txt',
);
if (fs.existsSync(thirdPartyLicenseFile)) {
  fs.copySync(thirdPartyLicenseFile, targetThirdPartyLicenseFile);
  console.log('   ✅ THIRD_PARTY_LICENSES.txt copied to Resources');
} else {
  console.log('   ⚠️  THIRD_PARTY_LICENSES.txt not found!');
}

// Step 7: Rename the executable inside MacOS folder
console.log('\n🏷️  Step 7: Renaming executable inside MacOS folder...');
const macosDir = path.join(nhToolsAppPath, 'Contents', 'MacOS');
const electronBinary = path.join(macosDir, 'Electron');
const nhToolsBinary = path.join(macosDir, 'nh-toolbox');

if (fs.existsSync(electronBinary)) {
  fs.renameSync(electronBinary, nhToolsBinary);
  console.log('   ✅ Renamed Electron → nh-toolbox');
} else {
  console.log('   ⚠️  Electron binary not found!');
}

// Step 8: Copy custom icons
console.log('\n🎨 Step 8: Copying custom icons...');
const iconSource = path.join(rootDir, 'assets', 'icons', 'icon.icns');
const iconDest = path.join(targetResourcesDir, 'icon.icns');

if (fs.existsSync(iconSource)) {
  fs.copySync(iconSource, iconDest);
  console.log('   ✅ Custom app icon copied');
} else {
  console.log('   ⚠️  Custom icon not found at assets/icons/icon.icns');
}

// Copy tray icon
const trayIconSource = path.join(rootDir, 'assets', 'icons', 'icon-tray.png');
const trayIconDest = path.join(targetResourcesDir, 'icon-tray.png');

if (fs.existsSync(trayIconSource)) {
  fs.copySync(trayIconSource, trayIconDest);
  console.log('   ✅ Tray icon copied');
} else {
  console.log('   ⚠️  Tray icon not found at assets/icons/icon-tray.png');
}

// Step 9: Update Info.plist
console.log('\n📝 Step 9: Updating Info.plist...');
const infoPlistPath = path.join(nhToolsAppPath, 'Contents', 'Info.plist');

if (fs.existsSync(infoPlistPath)) {
  let plistContent = fs.readFileSync(infoPlistPath, 'utf8');

  // Replace Electron with nh-toolbox in various plist keys
  plistContent = plistContent
    .replace(
      /<key>CFBundleExecutable<\/key>\s*<string>Electron<\/string>/g,
      '<key>CFBundleExecutable</key>\n\t<string>nh-toolbox</string>',
    )
    .replace(
      /<key>CFBundleName<\/key>\s*<string>Electron<\/string>/g,
      '<key>CFBundleName</key>\n\t<string>nh-toolbox</string>',
    )
    .replace(
      /<key>CFBundleDisplayName<\/key>\s*<string>Electron<\/string>/g,
      '<key>CFBundleDisplayName</key>\n\t<string>nh-toolbox</string>',
    )
    .replace(
      /<key>CFBundleIconFile<\/key>\s*<string>[^<]*<\/string>/g,
      '<key>CFBundleIconFile</key>\n\t<string>icon.icns</string>',
    );

  // Add icon file reference if it doesn't exist
  if (!plistContent.includes('CFBundleIconFile')) {
    plistContent = plistContent.replace(
      '</dict>\n</plist>',
      '\t<key>CFBundleIconFile</key>\n\t<string>icon.icns</string>\n</dict>\n</plist>',
    );
  }

  fs.writeFileSync(infoPlistPath, plistContent, 'utf8');
  console.log('   ✅ Info.plist updated with icon reference');
} else {
  console.log('   ⚠️  Info.plist not found!');
}

// Step 10: Summary
console.log('\n✅ Build completed successfully!\n');
console.log('📂 Output directory:', outputDir);
console.log('📦 App bundle location:', nhToolsAppPath);
console.log('📦 ASAR archive location:', asarPath);
console.log('📄 version.txt location:', targetVersionFile);
console.log('\n🚀 Run the app:');
console.log(`   open ${nhToolsAppPath}`);
console.log('   or double-click nh-toolbox.app in Finder');
console.log('\n💡 Note: App packaged with ASAR for production deployment');
