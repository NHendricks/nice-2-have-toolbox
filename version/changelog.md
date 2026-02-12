# nh-toolbox (https://github.com/NHendricks/nice-2-have-toolbox)

For use on MAC please read the readme at https://github.com/NHendricks/nice-2-have-toolbox
ou can find the binary downloads here: https://github.com/NHendricks/nh-toolbox/releases

## changelog

### upcoming

(you can download and test the dev version from https://github.com/NHendricks/nice-2-have-toolbox/actions/workflows/node.js.yml)

- commander
  - fix mac samba connection needs to be started multiple time to work
  - fix install restic detection on mac
  - set a default path for restic backup repo when not specified
- restic
  - create nicer checkboxes
  - restore folders (not only files) from backups
  - show called restic commands in history tab

### v1.9.0 (11.02.2026)

- general
  - store last used app and open this one at next start
  - save current values in apps (garbage, restic)
- restic
  - export / import settings
  - auto unfold folders in snapshot views
  - initialize backup => init all values from previous repo
  - add number of files in repo in snapshot view
  - show number of files in snapshot
  - restore single files
- commander
  - confirm delete of files
  - create dir: set marker on it to directly navigate into
  - fix marker CTRL+down marks 2 files
  - show date of files
  - fix date sort toggle
  - fix: copy zip into zip did not work
- new app Taskboard
  - manage your tasks in a kanban board (create, edit, delete, move up/down, use categories)

### v1.8.0 (10.02.2026)

- build linux app
- new app Garbagefinder - find your space hogs
- new app ResticUI - manage your backups easily
- fix file diff in directory compare
- show free disk space
- support for .n2henv files in a directory when open cmdline from n2h-commander (KEY=VALUE, e.g. for JAVA_HOME / PATH)
- lots of small bug fixes and improvements (see commits)

### v1.7.0 (07.02.2026)

- in drive dialog support keyboard navigation
- memorize directories and enable backward history navigation
- support nested zips
- add context menu using SHIFT+F10
- add open with dialog for open with native installed apps
  - enable selecting individual apps also
- export / import settings
- add network share support (Samba)
- add default search patterns for regex
- improve filter icon behaviour (more intuitive)
- Fix OneDrive Links recognition on Windows (hacky)
- open cmdline window with SHIFT+F9
- add text editor (F4)
- find files by text or name (ctrl+f)
- ftp support

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
