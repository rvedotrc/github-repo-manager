import { stat } from "node:fs/promises";
import { TopLevelDir } from "./index.js";
import { makePromiseLimiter } from "./promiseLimiter.js";
import { runAndCapture } from "./runAndCapture.js";

export type GitConfig = Record<string, string>;

const configLimiter = makePromiseLimiter(10, "git-config");

export const readGitConfig = async (
  repoTopLevel: TopLevelDir,
): Promise<GitConfig> => {
  const configText = (
    await configLimiter
      .submit(
        () =>
          runAndCapture("git", ["config", "--list", "--local"], {
            cwd: repoTopLevel,
          }),
        `list-${repoTopLevel}`,
      )
      .catch((err) =>
        stat(`${repoTopLevel}/.git/config`).then(
          () => {
            throw err;
          },
          (statErr) => {
            if (
              statErr instanceof Error &&
              "code" in statErr &&
              statErr.code === "ENOENT"
            )
              return { stdout: "" };
            throw err;
          },
        ),
      )
  ).stdout;

  const pairs = [...configText.matchAll(/^(.*?)=(.*)\n/gm)].map((match) => ({
    key: match[1],
    value: match[2],
  }));

  return pairs.reduce(
    (prev, curr) => ({
      ...prev,
      [curr.key]: curr.value,
    }),
    {},
  );
};

export const ensureConfig = async (
  key: string,
  value: string | undefined,
  repoTopLevel: TopLevelDir,
  config: Readonly<GitConfig>,
): Promise<void> => {
  if (config[key] === value) return;

  await configLimiter.submit(async () => {
    if (value === undefined) {
      await runAndCapture("git", ["config", "--unset", key], {
        cwd: repoTopLevel,
      });
    } else {
      console.log(`${repoTopLevel}: git config ${key} ${value}`);
      await runAndCapture("git", ["config", key, value], {
        cwd: repoTopLevel,
      });
    }
  }, `set-${repoTopLevel}-${key}`);
};
