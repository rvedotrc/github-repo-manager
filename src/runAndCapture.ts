// For now: stdin is always 'ignore', stderr is always 'inherit'
// and we always require success

import child_process, { SpawnOptionsWithoutStdio } from "child_process";

export const runAndCapture = (
  cmd: string,
  args: string[],
  opts: SpawnOptionsWithoutStdio = {},
): Promise<{ stdout: string }> =>
  new Promise((resolve, reject) => {
    let stdout = Buffer.of();

    const cp = child_process.spawn(cmd, args, {
      ...opts,
      stdio: ["ignore", "pipe", "inherit"],
    });

    cp.on("error", reject);
    cp.stdout.on("error", reject);
    cp.stdout.on("data", (chunk) => (stdout = Buffer.concat([stdout, chunk])));
    cp.on("close", (code, signal) => {
      if (code === null) reject(new Error(`command killed by ${signal}`));
      if (code !== 0) reject(new Error(`command exited with ${code}`));

      resolve({ stdout: stdout.toString("utf-8") });
    });
  });
