import { ToastContent } from './format';

/**
 * トーストを出す PowerShell のスクリプト。通知の内容は含めず、標準入力の JSON から読む。
 * 内容をスクリプトやコマンドラインに埋め込まないので、引用符や $ を含んでいても解釈されない。
 * XML にはテキストノードとして足すので、< や & もそのまま表示される。
 */
export const TOAST_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  "$ProgressPreference = 'SilentlyContinue'",
  '[Console]::InputEncoding = [System.Text.Encoding]::UTF8',
  '$in = [Console]::In.ReadToEnd() | ConvertFrom-Json',
  '[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]',
  '[void][Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]',
  '$xml = New-Object Windows.Data.Xml.Dom.XmlDocument',
  `$xml.LoadXml('<toast><visual><binding template="ToastGeneric"><text/><text/><text placement="attribution"/></binding></visual></toast>')`,
  "$texts = $xml.GetElementsByTagName('text')",
  '[void]$texts.Item(0).AppendChild($xml.CreateTextNode([string]$in.title))',
  '[void]$texts.Item(1).AppendChild($xml.CreateTextNode([string]$in.body))',
  '[void]$texts.Item(2).AppendChild($xml.CreateTextNode([string]$in.attribution))',
  // 表示時間。short（約 7 秒）か long（約 25 秒）
  "$xml.DocumentElement.SetAttribute('duration', [string]$in.duration)",
  '$toast = New-Object Windows.UI.Notifications.ToastNotification $xml',
  '[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier([string]$in.appId).Show($toast)',
].join('\n');

/** powershell.exe の -EncodedCommand に渡す形（UTF-16LE の Base64） */
export function encodePowerShellCommand(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64');
}

/** TOAST_SCRIPT の標準入力に渡す JSON */
export function toastInput(content: ToastContent, appId: string): string {
  return JSON.stringify({ appId, ...content });
}
