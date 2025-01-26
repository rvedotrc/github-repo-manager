import { type GitConfig } from "./gitConfig.js";
import { TopLevelDir } from "./index.js";
import {
  didFail,
  failed,
  succeeded,
  type SFWithContext,
} from "./logPromiseError.js";
import { PromiseLimiter } from "./promiseLimiter.js";
import { Repository } from "./referenceData.js";
import { runAndCapture } from "./runAndCapture.js";

import { somethingInProgress } from "@blaahaj/got-to-git";
import { tasks } from "./tasks/index.js";
import { fetchIfOutOfDate } from "./fetchIfOutOfDate.js";

export type UpdateLocalSuccessResult = {
  fetched: { fetched: boolean; reason?: string } | null;
  onDefaultBranch: boolean | null;
  gitStatusIsClean: boolean | null;
  gitStatusExcludingUntrackedIsClean: boolean | null;
  nothingInProgress: boolean | null;
  defaultBranchState:
    | "both-empty"
    | "awaiting-first-push"
    | "awaiting-first-pull"
    | "synced"
    | "local-ahead"
    | "remote-ahead"
    | "diverged"
    | "unrelated"
    | null;
  fastForwardMerged: boolean | null;
};

export type UpdateLocalResult = SFWithContext<
  unknown,
  UpdateLocalSuccessResult,
  unknown
>;

export const updateLocal = async (
  repoTopLevel: TopLevelDir,
  repo: Repository,
  limiter: PromiseLimiter<unknown>,
  localConfig: GitConfig,
): Promise<UpdateLocalResult> => {
  const result: UpdateLocalSuccessResult = {
    fetched: null,
    onDefaultBranch: null,
    gitStatusIsClean: null,
    gitStatusExcludingUntrackedIsClean: null,
    nothingInProgress: null,
    defaultBranchState: null,
    fastForwardMerged: false,
  };

  const inputs = {
    repoTopLevel,
    repo,
    localConfig,
  };

  const debug: Record<string, unknown> = {};

  const fetch = await fetchIfOutOfDate(
    repoTopLevel,
    repo,
    limiter,
    localConfig,
  );
  if (didFail(fetch)) return { inputs, debug, result: failed({ fetch }) };
  result.fetched = fetch.value;

  const gitStatusTask = tasks.gitStatusPorcelain(repoTopLevel);
  const headStatusTask = tasks.currentBranchName(repoTopLevel);
  const workingTreeStatusTask = tasks.workingTreeStatus(repoTopLevel);

  const headStatus = await headStatusTask.evaluate();
  if (didFail(headStatus)) return { inputs: {}, debug: {}, result: headStatus };
  const headRef = headStatus.value;
  debug.headRef = headRef;

  const defaultBranchRef = repo.defaultBranchRef?.name ?? "";
  debug.defaultBranchRef = defaultBranchRef;

  const listRefsTask = tasks.listRefs(repoTopLevel);

  const workingTreeStatus = await workingTreeStatusTask.evaluate();
  debug.workingTreeStatus = workingTreeStatus;

  const gitStatusPorcelainStatus = await gitStatusTask.evaluate();
  if (didFail(gitStatusPorcelainStatus))
    return { inputs, debug, result: failed({ gitStatusPorcelainStatus }) };
  const gitStatusPorcelain = gitStatusPorcelainStatus.value.answer;
  debug.gitStatusPorcelain = gitStatusPorcelain;

  const onDefaultBranch = headRef === `refs/heads/${defaultBranchRef}`;
  result.onDefaultBranch = onDefaultBranch;

  const nothingInProgress = !somethingInProgress(workingTreeStatus);
  result.nothingInProgress = nothingInProgress;

  const gitStatusIsClean = gitStatusPorcelain.length === 0;
  result.gitStatusIsClean = gitStatusIsClean;
  result.gitStatusExcludingUntrackedIsClean =
    gitStatusPorcelain.filter((st) => st.working !== "?" || st.index !== "?")
      .length === 0;

  const localRefs = await listRefsTask.evaluate();
  if (didFail(localRefs)) return { inputs, debug, result: localRefs };

  // FIXME: hard-wired remote name
  const localHash = localRefs.value.get(
    `refs/heads/${defaultBranchRef}`,
  )?.objectId;
  const remoteHash = localRefs.value.get(
    `refs/remotes/origin/${defaultBranchRef}`,
  )?.objectId;

  if (!localHash && !remoteHash) {
    result.defaultBranchState = "both-empty";
    return { inputs, debug, result: succeeded(result) };
  } else if (!remoteHash) {
    result.defaultBranchState = "awaiting-first-push";
    return { inputs, debug, result: succeeded(result) };
  } else if (!localHash) {
    result.defaultBranchState = "awaiting-first-pull";
    return { inputs, debug, result: succeeded(result) };
  }

  if (localHash === remoteHash) {
    result.defaultBranchState = "synced";
    return { inputs, debug, result: succeeded(result) };
  }

  // local-ahead or remote-ahead or diverged or unrelated
  const localAhead = await runAndCapture(
    "git",
    ["merge-base", "--is-ancestor", remoteHash, localHash],
    { cwd: repoTopLevel, requireSuccess: false },
  ).then((r) => {
    if (r.code === 0) return true;
    if (r.code === 1) return false;
    // FIXME
    throw new Error("git merge-base is-ancestor failed");
  });
  if (localAhead) {
    result.defaultBranchState = "local-ahead";
    return { inputs, debug, result: succeeded(result) };
  }

  const remoteAhead = await runAndCapture(
    "git",
    ["merge-base", "--is-ancestor", localHash, remoteHash],
    { cwd: repoTopLevel, requireSuccess: false },
  ).then((r) => {
    if (r.code === 0) return true;
    if (r.code === 1) return false;
    // FIXME
    throw new Error("git merge-base is-ancestor failed");
  });
  if (remoteAhead) {
    if (!onDefaultBranch || !nothingInProgress || !gitStatusIsClean) {
      result.defaultBranchState = "remote-ahead";
      return { inputs, debug, result: succeeded(result) };
    }

    const fastForwardMergeStatus = await runAndCapture(
      "git",
      ["merge", "--ff-only"],
      {
        cwd: repoTopLevel,
        requireSuccess: false,
      },
    );
    debug.fastForwardMergeStatus = fastForwardMergeStatus;

    if (fastForwardMergeStatus.code || fastForwardMergeStatus.signal) {
      return { inputs, debug, result: failed({ fastForwardMergeStatus }) };
    }

    result.fastForwardMerged = true;
    result.defaultBranchState = "synced";
    return { inputs, debug, result: succeeded(result) };
  }

  // Diverged, unrelated
  const mergeBaseStatus = await runAndCapture(
    "git",
    ["merge-base", localHash, remoteHash],
    { cwd: repoTopLevel, requireSuccess: false },
  );
  if (mergeBaseStatus.signal || (mergeBaseStatus.code ?? 0) > 1)
    return { inputs, debug, result: failed(mergeBaseStatus) };

  result.defaultBranchState =
    mergeBaseStatus.code === 0 ? "diverged" : "unrelated";

  return { inputs, debug, result: succeeded(result) };
};
