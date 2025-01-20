import { ensureConfig, type GitConfig } from "./gitConfig.js";
import { TopLevelDir } from "./index.js";
import { failed, succeeded, type SFWithContext } from "./logPromiseError.js";
import { PromiseLimiter } from "./promiseLimiter.js";
import { Repository } from "./referenceData.js";
import { runAndCapture } from "./runAndCapture.js";

import {
  checkWorkingTreeStatus,
  somethingInProgress,
} from "@blaahaj/got-to-git";

export const readGitStatus = async (repoTopLevel: TopLevelDir) => {
  const status = await runAndCapture("git", ["status", "--porcelain", "-z"], {
    cwd: repoTopLevel,
    requireSuccess: false,
  });

  if (status.code || status.signal) return failed({ repoTopLevel, status });

  const answer = status.stdout
    .split("\0")
    .filter((line) => line !== "")
    .map((line) => {
      const m = line.match(
        /^(?<working>[?ADM ])(?<index>[?ADM ]) (?<path>.*)$/,
      );
      if (m === null)
        throw new Error(`Unexpected line from git status: ${line}`);

      return m.groups as {
        working: string;
        index: string;
        path: string;
      };
    });

  return succeeded({ answer });
};

export type UpdateLocalResult = SFWithContext<
  unknown,
  { code: string },
  unknown
>;

const fetchIfOutOfDate = async (
  repoTopLevel: TopLevelDir,
  repo: Repository,
  limiter: PromiseLimiter<unknown>,
  localConfig: GitConfig,
): Promise<UpdateLocalResult> => {
  const key = "githubrepomanager.fetched.includes.pushedat";

  if (!repo.pushedAt)
    return {
      inputs: {},
      debug: {},
      result: succeeded({ code: "no pushedAt, not fetching" }),
    };

  if (localConfig[key] === repo.pushedAt) {
    return {
      inputs: {},
      debug: {},
      result: succeeded({ code: "nothing to fetch" }),
    };
  }

  console.log(`updateLocal ${repoTopLevel}: git fetch`);
  const fetch = await limiter.submit(
    () =>
      runAndCapture("git", ["fetch", "--prune", "--tags"], {
        cwd: repoTopLevel,
        requireSuccess: false,
      }),
    `git fetch in ${repoTopLevel}`,
  );

  if (fetch.code || fetch.signal)
    return {
      inputs: {},
      debug: { fetch },
      result: failed({ fetch }),
    };

  // Can fail, if "git config" fails
  await ensureConfig(key, repo.pushedAt as string, repoTopLevel, {});
  localConfig[key] = repo.pushedAt;

  return {
    inputs: {},
    debug: {},
    result: succeeded({ code: "fetched ok" }),
  };
};

export const updateLocal = async (
  repoTopLevel: TopLevelDir,
  repo: Repository,
  limiter: PromiseLimiter<unknown>,
  localConfig: GitConfig,
): Promise<UpdateLocalResult> => {
  const fetch = await fetchIfOutOfDate(
    repoTopLevel,
    repo,
    limiter,
    localConfig,
  );
  if (fetch.result.tag === "failed") return fetch;

  const headStatus = await runAndCapture("git", ["symbolic-ref", "HEAD"], {
    cwd: repoTopLevel,
    requireSuccess: false,
  });
  if (headStatus.code || headStatus.signal)
    return {
      inputs: {},
      debug: {},
      result: failed({ headStatus }),
    };

  const headRef = headStatus.stdout.trimEnd();

  const defaultBranchRef = repo.defaultBranchRef?.name ?? "";

  // Can fail, but only if error other than ENOENT comes up (e.g. EPERM or EISDIR)
  const workingTreeStatus = await checkWorkingTreeStatus(repoTopLevel);

  const gitStatusPorcelainStatus = await readGitStatus(repoTopLevel);
  if (gitStatusPorcelainStatus.tag === "failed")
    return {
      inputs: {},
      debug: {},
      result: failed({ gitStatusPorcelainStatus }),
    };
  const gitStatusPorcelain = gitStatusPorcelainStatus.value.answer;

  if (headRef !== `refs/heads/${defaultBranchRef}`) {
    return {
      inputs: {},
      debug: {},
      result: succeeded({
        code: "NOT_ON_DEFAULT_BRANCH",
        headRef,
        defaultBranchRef,
      }),
    };
  }

  if (somethingInProgress(workingTreeStatus)) {
    return {
      inputs: {},
      debug: {},
      result: succeeded({
        code: "SOMETHING_IN_PROGRESS",
        workingTreeStatus,
      }),
    };
  }

  if (gitStatusPorcelain.length !== 0) {
    return {
      inputs: {},
      debug: {},
      result: succeeded({
        code: "NOT_CLEAN",
        gitStatusPorcelain,
      }),
    };
  }

  const getLocalAndRemoteHeads = await runAndCapture(
    "git",
    ["rev-parse", "HEAD", `refs/remotes/origin/${defaultBranchRef}`],
    { cwd: repoTopLevel, requireSuccess: false },
  );
  if (getLocalAndRemoteHeads.code || getLocalAndRemoteHeads.signal) {
    return {
      inputs: {},
      debug: {},
      result: failed({
        getLocalAndRemoteHeads,
      }),
    };
  }

  const m = getLocalAndRemoteHeads.stdout.match(/^(\S+)\n(\S+)\n$/);
  const localHash = m?.[1];
  const remoteHash = m?.[2];

  if (localHash && remoteHash && localHash === remoteHash) {
    return {
      inputs: {},
      debug: {
        localHash,
        remoteHash,
        workingTreeStatus,
        gitStatusPorcelain,
      },
      result: succeeded({
        code: "NOTHING_TO_DO",
      }),
    };
  }

  if (localHash && remoteHash) {
    // Can fail
    const unpushedCommits = await runAndCapture(
      "git",
      ["rev-list", remoteHash, localHash],
      { cwd: repoTopLevel, requireSuccess: true },
    );

    if (unpushedCommits.stdout !== "")
      return {
        inputs: {},
        debug: {},
        result: succeeded({
          code: "DEFAULT_BRANCH_HAS_UNPUSHED_COMMITS",
          localHash,
          remoteHash,
          unpushedCommits: unpushedCommits.stdout,
          defaultBranchRef,
          workingTreeStatus,
          gitStatusPorcelain,
        }),
      };

    const fastForwardMergeStatus = await runAndCapture(
      "git",
      ["merge", "--ff-only"],
      {
        cwd: repoTopLevel,
        requireSuccess: false,
      },
    );

    if (fastForwardMergeStatus.code || fastForwardMergeStatus.signal) {
      return {
        inputs: {},
        debug: {
          localHash,
          remoteHash,
          gitStatusPorcelain,
          workingTreeStatus,
        },
        result: failed({
          fastForwardMergeStatus,
        }),
      };
    }

    return {
      inputs: {},
      debug: {},
      result: succeeded({
        code: "DEFAULT_BRANCH_UPDATE_VIA_FAST_FORWARD",
        localHash,
        remoteHash,
        defaultBranchRef,
        workingTreeStatus,
        gitStatusPorcelain,
      }),
    };
  } else {
    return {
      inputs: {},
      debug: {},
      result: failed({
        message: "TODO: what now?",
        localHash,
        remoteHash,
        defaultBranchRef,
        workingTreeStatus,
        gitStatusPorcelain,
      }),
    };
  }
};
