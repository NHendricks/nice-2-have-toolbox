# Configuration System

## Overview

The configuration system provides a safe way to store preferences in `~/n2htoolbox/` that may contain sensitive data like passwords.

**Important**: This system does NOT automatically save preferences. You must explicitly call save methods.

## Backend Command

Location: `backend/commands/config-command.ts`

Operations:

- `get-dir` - Get config directory path
- `read` - Read a config file
- `write` - Write a config file
- `list` - List all config files
- `delete` - Delete a config file
- `exists` - Check if a config file exists

## UI Service

Location: `ui/src/js/simpleweb/boundary/services/ConfigService.ts`

## Usage Examples

### Get config directory

```typescript
import { ConfigService } from './services/ConfigService';

const configDir = await ConfigService.getConfigDir();
console.log('Config directory:', configDir); // ~/n2htoolbox/
```

### Save preferences

```typescript
// Save settings to a config file
await ConfigService.writeConfig('my-app-settings.json', {
  theme: 'dark',
  language: 'en',
  lastPath: '/home/user/documents',
});
```

### Load preferences

```typescript
// Read settings from config file
const settings = await ConfigService.readConfig('my-app-settings.json');

if (settings) {
  console.log('Theme:', settings.theme);
} else {
  console.log('No saved settings found');
}
```

### Check if config exists

```typescript
const exists = await ConfigService.configExists('my-app-settings.json');
if (exists) {
  // Load existing config
} else {
  // Use defaults
}
```

### List all config files

```typescript
const files = await ConfigService.listConfigs();
console.log('Config files:', files);
// [{name: 'settings.json', path: '/home/user/n2htoolbox/settings.json'}, ...]
```

### Delete a config file

```typescript
await ConfigService.deleteConfig('old-settings.json');
```

## Security Notes

1. **Never auto-save**: Don't automatically save preferences on every change
2. **User consent**: Always ask users before saving sensitive data
3. **Password handling**: Consider encrypting passwords or storing them separately
4. **Clear warnings**: Warn users before exporting settings that may contain passwords

## Integration Example

```typescript
// In your component
class MyApp extends LitElement {
  async exportSettings() {
    // Collect settings from localStorage or component state
    const settings = {
      theme: this.theme,
      // DON'T include passwords automatically
      // lastPath: this.lastPath,
    };

    // Save to config file
    await ConfigService.writeConfig('my-app.json', settings);
    alert('Settings saved to ~/n2htoolbox/my-app.json');
  }

  async loadSettings() {
    const settings = await ConfigService.readConfig('my-app.json');
    if (settings) {
      this.theme = settings.theme;
      // Apply other settings...
    }
  }
}
```

## File Format

Config files are stored as JSON by default:

```json
{
  "theme": "dark",
  "language": "en",
  "lastPath": "/home/user/documents"
}
```

You can also store plain text by passing a string instead of an object.
