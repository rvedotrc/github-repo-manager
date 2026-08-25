import { ensureConfig, type GitConfig } from "./gitConfig.js";
import type { TopLevelDir } from "./index.js";
import { failed, succeeded } from "./logPromiseError.js";
import type { PromiseLimiter } from "./promiseLimiter.js";
import type { Repository } from "./referenceData.js";
import { runAndCapture } from "./runAndCapture.js";

export const fetchIfOutOfDate = async (
  repoTopLevel: TopLevelDir,
  repo: Repository,
  limiter: PromiseLimiter<unknown>,
  localConfig: GitConfig,
) => {
  const key = "githubrepomanager.fetched.includes.pushedat";

  if (!repo.pushedAt)
    return succeeded({ fetched: false, reason: "no pushedAt" });

  if (localConfig[key] === repo.pushedAt)
    return succeeded({ fetched: false, reason: "up to date" });

  console.log(`updateLocal ${repoTopLevel}: git fetch`);
  const fetch = await limiter.submit(
    () =>
      runAndCapture("git", ["fetch", "--prune", "--tags"], {
        cwd: repoTopLevel,
        requireSuccess: false,
      }),
    `git fetch in ${repoTopLevel}`,
  );

  if (fetch.code || fetch.signal) return failed({ fetch });

  // Can fail, if "git config" fails
  await ensureConfig(key, repo.pushedAt as string, repoTopLevel, {});
  localConfig[key] = repo.pushedAt;

  return succeeded({ fetched: true });
};
