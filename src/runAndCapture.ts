import child_process, { SpawnOptionsWithoutStdio } from "child_process";

export type CommandResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
};

class CommandFailedException extends Error {
  constructor(public readonly commandResult: CommandResult) {
    const message =
      commandResult.code === null
        ? `command killed by ${commandResult.signal}`
        : `command exited with ${commandResult.code}`;

    super(message);
  }
}

export const runAndCapture = (
  cmd: string,
  args: string[],
  opts: SpawnOptionsWithoutStdio & { requireSuccess?: boolean } = {},
): Promise<CommandResult> =>
  new Promise((resolve, reject) => {
    let stdout = Buffer.of();
    let stderr = Buffer.of();

    const cp = child_process.spawn(cmd, args, {
      ...opts,
      stdio: ["ignore", "pipe", "pipe"],
    });

    cp.on("error", reject);

    cp.stdout.on("error", reject);
    cp.stdout.on("data", (chunk) => (stdout = Buffer.concat([stdout, chunk])));

    cp.stderr.on("error", reject);
    cp.stderr.on("data", (chunk) => (stderr = Buffer.concat([stderr, chunk])));

    cp.on("close", (code, signal) => {
      const result: CommandResult = {
        stdout: stdout.toString("utf-8"),
        stderr: stderr.toString("utf-8"),
        code,
        signal,
      };

      if (result.code !== 0 && (opts.requireSuccess ?? true)) {
        reject(new CommandFailedException(result));
      }

      resolve(result);
    });
  });
