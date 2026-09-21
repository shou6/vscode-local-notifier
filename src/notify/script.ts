import { ToastContent } from './format';

/** トーストを出す PowerShell のスクリプト。通知の内容は含めず、標準入力の JSON から読む */
export const TOAST_SCRIPT = '';

/** powershell.exe の -EncodedCommand に渡す形（UTF-16LE の Base64） */
export function encodePowerShellCommand(_script: string): string {
  throw new Error('not implemented');
}

/** TOAST_SCRIPT の標準入力に渡す JSON */
export function toastInput(_content: ToastContent, _appId: string): string {
  throw new Error('not implemented');
}
