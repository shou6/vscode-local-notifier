# Local Notifier for VS Code

[![CI](https://github.com/shou6/vscode-local-notifier/actions/workflows/ci.yml/badge.svg)](https://github.com/shou6/vscode-local-notifier/actions/workflows/ci.yml)

[English](README.md)

AI エージェントなどのツールが作業を終えた時に、Windows のデスクトップ通知を出す。ツールが Dev Container や WSL の中で動いていても届く。hook からコマンドを実行できるツールなら何でも使える。

別のアプリ、ポート、トークンは要らない。hook が受信箱のフォルダへ小さな JSON のファイルを書き、拡張がそれを通知として表示する。

## 機能

- **テスト通知を送る**：受信箱を経由してテスト通知を出し、通知が届くことを確かめる
- **hook のコマンドをコピー**：今の環境から通知を送るコマンドをコピーする。ツールの hook の設定に貼り付けて使う

## 使い方

1. フォルダをローカル、WSL、Dev Container のいずれかで開く
2. コマンドパレット（`Ctrl+Shift+P`）から **Local Notifier: hook のコマンドをコピー** を実行する
3. ツールの hook の設定にコマンドを貼り付け、タイトルと本文を好みに書き換える

## 受信箱の場所

| ツールが動く場所 | 受信箱 |
| --- | --- |
| Windows（ローカル） | VS Code がこの拡張機能のために用意する保存フォルダ |
| WSL | ローカルと同じ。コマンドの中で `wslpath` でパスを変換する |
| Dev Container | プロジェクトの `.devcontainer/.local-notifier/inbox` |

Dev Container では、受信箱がリポジトリに入らないよう、拡張が `.devcontainer/.local-notifier/.gitignore` も作る。

## 通知の形式

hook は、通知 1 件ごとに JSON のファイルを 1 つ書く。

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `title` | 必須 | 通知のタイトル |
| `message` | 必須 | 通知の本文 |
| `project` | 任意 | プロジェクト名。Dev Container では、省略するとワークスペースのフォルダ名になる |
| `level` | 任意 | `info`、`success`、`warning`、`error` のいずれか。省略すると `info` |
| `source` | 任意 | ツールの名前。本文の下に表示する |

## 設定例：Dev Container の Claude Code

コピーしたコマンドを `.claude/settings.local.json` の `hooks` に足す。JSON の中では、コマンドの二重引用符をエスケープする。

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

## 設定

| 設定 | 既定 | 内容 |
| --- | --- | --- |
| `localNotifier.enabled` | `true` | 受信箱を見張り、デスクトップ通知を出す |
| `localNotifier.inboxPath` | 空 | 既定の代わりにローカルの受信箱にするフォルダ |

## 動作環境

- Windows
- Visual Studio Code 1.138 以上

## 制限

- 通知が出るのは VS Code が動いている間だけ
- Remote SSH には対応していない

## ライセンス

[MIT](LICENSE)
