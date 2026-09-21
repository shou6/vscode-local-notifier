/** Windows PowerShell の AppUserModelID。VS Code の ID が分からない時に使う */
export const POWERSHELL_APP_ID =
  '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe';

/** vscode.env.appName から、トーストの送信元にする AppUserModelID を決める */
export function toastAppId(_appName: string): string {
  throw new Error('not implemented');
}
