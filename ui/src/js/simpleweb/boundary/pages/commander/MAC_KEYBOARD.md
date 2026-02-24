# macOS Keyboard Support

## Function Keys on macOS

On macOS, function keys (F1-F12) often trigger system actions (brightness, volume, Mission Control, etc.). In Commander, you may need to press **Fn** with the function key unless your macOS setting uses F-keys as standard keys.

### How to use shortcuts:

- **F1** (Help): `Fn + F1`
- **F2** (Rename): `Fn + F2`
- **F3** (View): `Fn + F3`
- **F4** (Edit): `Fn + F4`
- **F5** (Copy): `Fn + F5`
- **F6** (Move): `Fn + F6`
- **F7** (Create folder): `Fn + F7`
- **F8** (Delete): `Fn + F8` or `Delete`
- **F9** (Command dialog): `Fn + F9`
- **Shift+F9** (Open terminal): `Fn + Shift + F9`
- **F10** (Copy selected path): `Fn + F10`
- **Shift+F10** (Context menu): `Fn + Shift + F10`
- **F11** (Compare files): `Fn + F11`
- **Shift+F11** (Compare directories): `Fn + Shift + F11`
- **F12** (Create ZIP): `Fn + F12`

### Selection and modifiers on macOS

- **Shift+Click**: Toggle file selection
- **Shift+↑ / ↓ / PageUp / PageDown / Home / End**: Extend selection with keyboard navigation
- **Shift+Space**: Toggle selection on focused item
- **⌥+← / ⌥+→**: Navigate history back/forward
- **⌘+1 / ⌘+2** or **⌥+1 / ⌥+2**: Open drive selector for left/right pane
- **Ctrl+S**: Show directory size
- **Ctrl+F**: Open search

### Alternative: Change macOS Settings

If you want to use F-keys without pressing Fn every time:

1. Open **System Settings**
2. Go to **Keyboard**
3. Click **Keyboard Shortcuts...**
4. Select **Function Keys** from the left sidebar
5. Enable **"Use F1, F2, etc. keys as standard function keys"**

After this change:

- F-keys work directly (without Fn)
- Special functions require Fn (for example `Fn + F1` for brightness)

## Implementation Details

The KeyboardHandler uses `event.code` instead of `event.key` for function keys. This ensures that:

- Function keys are detected by their physical position
- Works consistently across different keyboard layouts
- Properly handles the Fn modifier on macOS
