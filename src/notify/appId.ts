/** Windows PowerShell の AppUserModelID。VS Code の ID が分からない時に使う */
export const POWERSHELL_APP_ID =
  '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe';

/** vscode.env.appName → VS Code が Windows に登録している AppUserModelID */
const KNOWN_APP_IDS: Record<string, string> = {
  'Visual Studio Code': 'Microsoft.VisualStudioCode',
  'Visual Studio Code - Insiders': 'Microsoft.VisualStudioCode.Insiders',
};

/**
 * トーストの送信元にする AppUserModelID を決める。
 * VS Code 自身の ID を使うと、送信元に「Visual Studio Code」とアイコンが出る。
 */
export function toastAppId(appName: string): string {
  return KNOWN_APP_IDS[appName] ?? POWERSHELL_APP_ID;
}
