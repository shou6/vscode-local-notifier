# Local Notifier for VS Code

[![CI](https://github.com/shou6/vscode-local-notifier/actions/workflows/ci.yml/badge.svg)](https://github.com/shou6/vscode-local-notifier/actions/workflows/ci.yml)

[English](README.md)

AI エージェントなどのツールが作業を終えた時に、Windows のデスクトップ通知を出す。ツールが Dev Container の中で動いていても届く。hook を掛けられるツールなら何でも使える。

> 開発中のため、hook からの通知の受け取りはまだ使えない。

## 機能

- **Send Test Notification**：テスト通知を出し、通知が届くことを確かめる

## 使い方

1. コマンドパレット（`Ctrl+Shift+P`）を開く
2. **Local Notifier: テスト通知を送る** を実行する

## 動作環境

- Windows
- Visual Studio Code 1.138 以上

## ライセンス

[MIT](LICENSE)
