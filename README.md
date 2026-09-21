# Local Notifier for VS Code

[![CI](https://github.com/shou6/vscode-local-notifier/actions/workflows/ci.yml/badge.svg)](https://github.com/shou6/vscode-local-notifier/actions/workflows/ci.yml)

[日本語](README.ja.md)

Shows Windows desktop notifications when AI agents and other tools finish their work. It works even when they run inside a Dev Container or WSL. Any tool that can run a command from a hook can use it.

You don't need a separate app, port, or token. A hook writes a small JSON file to an inbox folder, and the extension shows it as a notification.

## Features

- **Send Test Notification**: sends a test notification through the inbox to check the setup.
- **Copy Hook Command**: copies a command that sends a notification from the current environment. Paste it into your tool's hook settings.

## Usage

1. Open a folder locally, in WSL, or in a Dev Container.
2. Run **Local Notifier: Copy Hook Command** from the Command Palette (`Ctrl+Shift+P`).
3. Paste the command into your tool's hook settings, and change the title and message as you like.

## Where the inbox is

| Where your tool runs | Inbox |
| --- | --- |
| Windows (local) | The storage folder that Visual Studio Code provides for this extension |
| WSL | Same as local. The command converts the path with `wslpath` |
| Dev Container | `.devcontainer/.local-notifier/inbox` in your project |

In a Dev Container, the extension also adds a `.gitignore` next to the inbox. It keeps the inbox out of Git.

## Notification format

A hook writes one JSON file per notification.

| Field | Required | Description |
| --- | --- | --- |
| `title` | Yes | Title of the notification |
| `message` | Yes | Body of the notification |
| `project` | No | Project name. Defaults to the workspace folder name in a Dev Container |
| `level` | No | `info`, `success`, `warning`, or `error`. Defaults to `info` |
| `source` | No | Name of the tool, shown below the message |

## Example: Claude Code in a Dev Container

Add the copied command to `hooks` in `.claude/settings.local.json`. In JSON, escape the double quotes in the command.

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "d='/workspace/.devcontainer/.local-notifier/inbox'; n=\"$(date +%s%N)-$$\"; printf '%s' '{\"title\":\"Claude Code\",\"message\":\"Task completed\",\"level\":\"success\",\"source\":\"Claude Code\"}' > \"$d/.tmp-$n.json\" && mv \"$d/.tmp-$n.json\" \"$d/$n.json\""
          }
        ]
      }
    ]
  }
}
```

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `localNotifier.enabled` | `true` | Watch the inbox and show desktop notifications |
| `localNotifier.inboxPath` | Empty | Folder to use as the local inbox instead of the default one |

## Requirements

- Windows
- Visual Studio Code 1.138 or later

## Known limitations

- The extension shows notifications while Visual Studio Code runs.
- Remote SSH is not supported.

## License

[MIT](LICENSE)
