# App Icons

This directory contains the application icons for nh-toolbox.

## Files

- **icon-1024.png** - Source icon image (1024x1024 pixels)
- **icon.icns** - macOS app icon file (generated from icon-1024.png)

## Icon Design

The current icon features:

- Blue gradient background with rounded corners
- "NH" initials in white with shadow effect
- Small toolbox graphic below the text
- Professional and modern design

## Customizing the Icon

To create a custom icon:

1. **Replace the source image:**
   - Create a 1024x1024 PNG image
   - Save it as `icon-1024.png` in this directory

2. **Generate the .icns file:**

   ```bash
   cd assets/icons

   # Create iconset directory
   mkdir -p icon.iconset

   # Generate all required sizes
   sips -z 16 16 icon-1024.png --out icon.iconset/icon_16x16.png
   sips -z 32 32 icon-1024.png --out icon.iconset/icon_16x16@2x.png
   sips -z 32 32 icon-1024.png --out icon.iconset/icon_32x32.png
   sips -z 64 64 icon-1024.png --out icon.iconset/icon_32x32@2x.png
   sips -z 128 128 icon-1024.png --out icon.iconset/icon_128x128.png
   sips -z 256 256 icon-1024.png --out icon.iconset/icon_128x128@2x.png
   sips -z 256 256 icon-1024.png --out icon.iconset/icon_256x256.png
   sips -z 512 512 icon-1024.png --out icon.iconset/icon_256x256@2x.png
   sips -z 512 512 icon-1024.png --out icon.iconset/icon_512x512.png
   sips -z 1024 1024 icon-1024.png --out icon.iconset/icon_512x512@2x.png

   # Convert to .icns
   iconutil -c icns icon.iconset -o icon.icns

   # Clean up
   rm -rf icon.iconset
   ```

3. **Rebuild the app:**
   ```bash
   npm run buildMacApp
   ```

## Icon Requirements

For macOS apps, the icon should:

- Be in .icns format
- Include multiple resolutions (16x16 to 1024x1024)
- Have a transparent or solid background
- Follow Apple's Human Interface Guidelines

## Build Integration

The build script (`tools/build-mac.js`) automatically:

1. Copies `icon.icns` to the app's Resources folder
2. Updates `Info.plist` to reference the icon
3. Applies the icon to the built application

The icon will appear:

- In Finder
- In the Dock when the app is running
- In the Applications folder
- In Spotlight search results
