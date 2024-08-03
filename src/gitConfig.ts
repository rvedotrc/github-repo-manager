import { runAndCapture } from "./runAndCapture";
import { makePromiseLimiter } from "./promiseLimiter";
import { TopLevelDir } from "./index";

export type GitConfig = Record<string, string>;

const configLimiter = makePromiseLimiter<any>(10, "git-config");

export const readGitConfig = async (
  repoTopLevel: TopLevelDir,
): Promise<GitConfig> => {
  const configText = (
    await configLimiter.submit(
      () =>
        runAndCapture("git", ["config", "--list", "--local"], {
          cwd: repoTopLevel,
        }),
      `list-${repoTopLevel}`,
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
      await runAndCapture("git", ["config", key, value], { cwd: repoTopLevel });
    }
  }, `set-${repoTopLevel}-${key}`);
};
