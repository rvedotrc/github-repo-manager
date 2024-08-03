import { runAndCapture } from "./runAndCapture";
import { makePromiseLimiter } from "./promiseLimiter";

export type GitConfig = Record<string, string>;

const configLimiter = makePromiseLimiter<any>(10, "git-config");

export const readGitConfig = async (dir: string): Promise<GitConfig> => {
  const configText = (
    await configLimiter.submit(
      () => runAndCapture("git", ["config", "--list", "--local"], { cwd: dir }),
      `list-${dir}`,
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
  dir: string,
  config: Readonly<GitConfig>,
): Promise<void> => {
  if (config[key] === value) return;

  await configLimiter.submit(async () => {
    if (value === undefined) {
      await runAndCapture("git", ["config", "--unset", key], { cwd: dir });
    } else {
      console.log(`${dir}: git config ${key} ${value}`);
      await runAndCapture("git", ["config", key, value], { cwd: dir });
    }
  }, `set-${dir}-${key}`);
};
