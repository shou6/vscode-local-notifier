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
3. `done` や `waiting` など、送る通知を選ぶ
4. hook を書く場所に合わせて、**このワークスペースだけ** か **すべてのワークスペース** を選ぶ
5. ツールの hook の設定にコマンドを貼り付ける

後で文面を変える時は、設定 `localNotifier.presets` を書き換える。hook を触る必要はない。設定の変更はすぐに反映される。

拡張を更新した後は、開いているすべてのウィンドウを再読み込みする。古い版のままのウィンドウは、新しい形式の通知を捨てることがある。

## 受信箱の場所

ウィンドウごとに、そのワークスペース用の受信箱と、すべてのウィンドウで共有する受信箱を見張る。

| ツールが動く場所 | このワークスペースだけ | すべてのワークスペース |
| --- | --- | --- |
| Windows（ローカル） | VS Code がワークスペースごとに用意する保存フォルダ | VS Code がこの拡張機能のために用意する保存フォルダ |
| WSL | ローカルと同じ。コマンドの中で `wslpath` でパスを変換する | ローカルと同じ |
| Dev Container | プロジェクトの `.devcontainer/.local-notifier/inbox` | 使えない |

プロジェクトの設定に書く hook には、**このワークスペースだけ** を使う。そのワークスペースのウィンドウだけが通知を処理するので、ワークスペースの設定の定義が効く。ユーザーの設定に書く hook には、**すべてのワークスペース** を使う。開いているどれかのウィンドウが、ユーザーの設定の定義で通知する。

Dev Container では、受信箱がリポジトリに入らないよう、拡張が `.devcontainer/.local-notifier/.gitignore` も作る。

## 通知の形式

hook は、通知 1 件ごとに JSON のファイルを 1 つ書く。文面は、定義の名前で指定するか、直接書く。

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `preset` | 任意 | 定義の名前。定義の文面を使う |
| `title` | `preset` が無ければ必須 | 通知のタイトル。定義を上書きする |
| `message` | `preset` が無ければ必須 | 通知の本文。定義を上書きする |
| `project` | 任意 | プロジェクト名。Dev Container では、省略するとワークスペースのフォルダ名になる |
| `level` | 任意 | `info`、`success`、`warning`、`error` のいずれか。省略すると定義の値、それも無ければ `info`。絵文字と表示時間が変わる |
| `source` | 任意 | ツールの名前。本文の下に表示する |

## 通知の定義

既定で 3 つの定義がある。文面は VS Code の表示言語に合わせて変わる。

| 名前 | 用途 | 種類 |
| --- | --- | --- |
| `done` | 作業の完了 | `success` |
| `waiting` | 入力や許可の待ち | `info` |
| `error` | エラーでの停止 | `error` |

設定 `localNotifier.presets` で、定義を上書きしたり足したりできる。既定と同じ名前なら、書いた項目だけが変わる。プロジェクト固有の文面は、ワークスペースの `.vscode/settings.json` に書く。

```json
{
  "localNotifier.presets": {
    "done": { "message": "ビルドとテストが通りました。" },
    "review": { "title": "レビュー依頼", "message": "変更を確認してください。", "level": "warning" }
  }
}
```

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
            "command": "d='/workspace/.devcontainer/.local-notifier/inbox'; n=\"$(date +%s%N)-$$\"; printf '%s' '{\"preset\":\"done\"}' > \"$d/.tmp-$n.json\" && mv \"$d/.tmp-$n.json\" \"$d/$n.json\""
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
| `localNotifier.presets` | 空 | 上書きや追加をする通知の定義 |
| `localNotifier.showLevelIcon` | `true` | タイトルの前に種類の絵文字を付ける。✅ 成功、ℹ️ 情報、🟡 警告、🔴 エラー |
| `localNotifier.duration` | 警告とエラーだけ `long` | 種類ごとの表示時間。`short` は約 7 秒、`long` は約 25 秒 |

## 動作環境

- Windows
- Visual Studio Code 1.138 以上

## 制限

- 通知が出るのは VS Code が動いている間だけ
- Remote SSH には対応していない

## ライセンス

[MIT](LICENSE)
