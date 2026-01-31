# nh-toolbox (https://github.com/NHendricks/nh-toolbox)

## changelog

### upcoming

- in drive dialog support keyboard navigation

### v1.5.0 (31.01.2026)

- fix zooming ctrl+ and ctrl- for german keyboard layout
- add customized electron menu
- add moneyfinder app to toolbox (supports banking camt0.53-xml and legacy 768 chars formats)
- add feature to compare a directory with a directory in zip file

### v1.4.0 (28.01.2026)

- add progressbar when zipping files
- add progressbar when copying files
- support cancel for file operations (they did not cancel in backend before)
- build asar archives in build (less files in binary)
- fix tray icon for mac
- fix no ctrl+1 dialog when only 1 drive is there (mac) so we cant set favorites

### v1.3.0 (27.01.2026)

- pos1 und end should navigate to top, end
- ENTER executes an executable
- display own icons for files depending on extension
- typing text will execute commands in cmdline
- delete key should also delete file like F8
- enable sorting
- rename files using F2
- zip files or folders (F12)
- bugfix: Support links

### v1.1.0 (26.01.2026)

- navigate to parent folder automatically if folder does not exist (any more)
- execute a command in current directory
- copy path to clipboard
- add feature for favorites in drive selection overview
- fix ESC and Enter keys in dialogs
- compare directories
- use page up/down for faster navigation
- add regex filter for compare directory function
- use smaller font for files
- add icon to app
- add file filter using ALT+f
- switch to english in UI
- add diff feature in directory compare dialog
- open same folder in other pane using ctrl+left/right

### v1.0.0 (25.01.2026)

- base app with file commander utility
