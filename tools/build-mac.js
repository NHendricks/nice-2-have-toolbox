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
const outputDir = path.join(rootDir, 'build-output');
const appDir = path.join(rootDir, 'app-content');
const versionFile = path.join(rootDir, 'version', 'version.txt');

console.log('🚀 Starting manual Electron build for Mac (without ASAR)...\n');

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

// Copy process
const processDist = path.join(rootDir, 'process', 'dist');
const appProcess = path.join(appDir, 'process', 'dist');
if (fs.existsSync(processDist)) {
  fs.copySync(processDist, appProcess);
  console.log('   ✅ Process copied');
} else {
  console.log('   ⚠️  Process dist not found - run buildProcess first!');
}

// Copy process node_modules (if needed)
const processNodeModules = path.join(rootDir, 'process', 'node_modules');
const appProcessNodeModules = path.join(appDir, 'process', 'node_modules');
if (fs.existsSync(processNodeModules)) {
  fs.copySync(processNodeModules, appProcessNodeModules);
  console.log('   ✅ Process node_modules copied');
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

// Step 4: Copy app folder directly (no ASAR)
console.log('\n📂 Step 4: Copying app folder to resources...');
// On Mac, the resources directory is inside the app bundle
const electronAppPath = path.join(outputDir, 'Electron.app');
const resourcesDir = path.join(electronAppPath, 'Contents', 'Resources');
const appFolderPath = path.join(resourcesDir, 'app');

// Remove old app folder if exists
if (fs.existsSync(appFolderPath)) {
  fs.removeSync(appFolderPath);
  console.log('   🗑️  Removed old app folder');
}

// Remove app.asar if exists (cleanup from old build)
const oldAsarPath = path.join(resourcesDir, 'app.asar');
if (fs.existsSync(oldAsarPath)) {
  fs.removeSync(oldAsarPath);
  console.log('   🗑️  Removed old app.asar');
}

// Copy app-content to resources/app
fs.copySync(appDir, appFolderPath);
console.log('   ✅ App folder copied successfully!');

// Calculate size
const calculateDirSize = (dirPath) => {
  let size = 0;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      size += calculateDirSize(filePath);
    } else {
      size += fs.statSync(filePath).size;
    }
  }
  return size;
};

const appSize = calculateDirSize(appFolderPath);
console.log(`   📊 Size: ${(appSize / 1024 / 1024).toFixed(2)} MB`);

// Step 5: Rename Electron.app to nh-tools.app (do this before version.txt)
console.log('\n🏷️  Step 5: Renaming Electron.app to nh-tools.app...');
const nhToolsAppPath = path.join(outputDir, 'nh-tools.app');

if (fs.existsSync(electronAppPath)) {
  fs.renameSync(electronAppPath, nhToolsAppPath);
  console.log('   ✅ Renamed Electron.app → nh-tools.app');
} else {
  console.log('   ⚠️  Electron.app not found!');
}

// Step 6: Copy version.txt
console.log('\n📄 Step 6: Copying version.txt...');
const targetResourcesDir = path.join(nhToolsAppPath, 'Contents', 'Resources');
const targetVersionFile = path.join(targetResourcesDir, 'version.txt');

if (fs.existsSync(versionFile)) {
  fs.copySync(versionFile, targetVersionFile);
  console.log('   ✅ version.txt copied to Resources');
} else {
  console.log('   ⚠️  version.txt not found at source!');
}

// Step 7: Rename the executable inside MacOS folder
console.log('\n🏷️  Step 7: Renaming executable inside MacOS folder...');
const macosDir = path.join(nhToolsAppPath, 'Contents', 'MacOS');
const electronBinary = path.join(macosDir, 'Electron');
const nhToolsBinary = path.join(macosDir, 'nh-tools');

if (fs.existsSync(electronBinary)) {
  fs.renameSync(electronBinary, nhToolsBinary);
  console.log('   ✅ Renamed Electron → nh-tools');
} else {
  console.log('   ⚠️  Electron binary not found!');
}

// Step 8: Update Info.plist
console.log('\n� Step 8: Updating Info.plist...');
const infoPlistPath = path.join(nhToolsAppPath, 'Contents', 'Info.plist');

if (fs.existsSync(infoPlistPath)) {
  let plistContent = fs.readFileSync(infoPlistPath, 'utf8');

  // Replace Electron with nh-tools in various plist keys
  plistContent = plistContent
    .replace(
      /<key>CFBundleExecutable<\/key>\s*<string>Electron<\/string>/g,
      '<key>CFBundleExecutable</key>\n\t<string>nh-tools</string>',
    )
    .replace(
      /<key>CFBundleName<\/key>\s*<string>Electron<\/string>/g,
      '<key>CFBundleName</key>\n\t<string>nh-tools</string>',
    )
    .replace(
      /<key>CFBundleDisplayName<\/key>\s*<string>Electron<\/string>/g,
      '<key>CFBundleDisplayName</key>\n\t<string>nh-tools</string>',
    );

  fs.writeFileSync(infoPlistPath, plistContent, 'utf8');
  console.log('   ✅ Info.plist updated');
} else {
  console.log('   ⚠️  Info.plist not found!');
}

// Step 9: Summary
console.log('\n✅ Build completed successfully!\n');
console.log('📂 Output directory:', outputDir);
console.log('📦 App bundle location:', nhToolsAppPath);
console.log('📄 version.txt location:', targetVersionFile);
console.log('\n🚀 Run the app:');
console.log(`   open ${nhToolsAppPath}`);
console.log('   or double-click nh-tools.app in Finder');
console.log('\n💡 Note: App runs without ASAR packaging (direct file access)');
