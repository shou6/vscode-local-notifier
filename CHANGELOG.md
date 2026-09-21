# Changelog

This file records all notable changes to this extension.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0]

Initial release.

### Added

- Windows desktop notifications from any tool that can run a hook. It works locally, in WSL, and in a Dev Container.
- A hook writes a small JSON file to an inbox, and the extension shows it as a notification.
- **Copy Hook Command**: copies a ready-to-use command for the current environment.
- Two kinds of inbox: one for this workspace, and one shared by all workspaces.
- Presets: `done`, `waiting`, and `error` come built-in. Change them in `localNotifier.presets` without touching the hook.
- An emoji for each kind of notification (`localNotifier.showLevelIcon`).
- A display time for each kind of notification (`localNotifier.duration`).
- **Show Status**: whether notifications work, and which inboxes this window watches.
- **Send Test Notification**, and a log in the **Local Notifier** output channel.
