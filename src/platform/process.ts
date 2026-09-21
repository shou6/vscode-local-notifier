import { spawn } from 'child_process';

export interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

/** 外部プロセスの起動。テストではフェイクに差し替える */
export interface ProcessRunner {
  run(command: string, args: string[], stdin: string): Promise<ProcessResult>;
}

/** これより長くかかったプロセスは止める */
const TIMEOUT_MS = 10_000;

/** Node の spawn による実装。シェルを通さず、引数はそのまま渡す */
export const nodeProcessRunner: ProcessRunner = {
  run(command, args, stdin) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { windowsHide: true, timeout: TIMEOUT_MS });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));
      child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk));
      child.on('error', reject);
      child.on('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
      child.stdin.end(stdin, 'utf8');
    });
  },
};
