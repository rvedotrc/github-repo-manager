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
  noUnpushedCommits: boolean | null;
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
    noUnpushedCommits: null,
    fastForwardMerged: null,
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

  const localAndRemoteHeadsTask = tasks.localAndRemoteHeads(
    repoTopLevel,
    defaultBranchRef,
    "origin",
  );

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
  result.gitStatusExcludingUntrackedIsClean = !gitStatusPorcelain.some(
    (st) => st.working === "?" && st.index === "?",
  );

  if (!onDefaultBranch || !nothingInProgress || !gitStatusIsClean) {
    return { inputs, debug, result: succeeded(result) };
  }

  const localAndRemoteHeads = await localAndRemoteHeadsTask.evaluate();
  if (didFail(localAndRemoteHeads))
    return { inputs, debug, result: localAndRemoteHeads };

  const { localHash, remoteHash } = localAndRemoteHeads.value;

  if (localHash && remoteHash && localHash === remoteHash) {
    result.noUnpushedCommits = true;
    result.fastForwardMerged = false;
    return { inputs, debug, result: succeeded(result) };
  }

  if (localHash && remoteHash) {
    // Can fail
    const unpushedCommits = await runAndCapture(
      "git",
      ["rev-list", remoteHash, localHash],
      { cwd: repoTopLevel, requireSuccess: true },
    );

    debug.unpushedCommits = unpushedCommits.stdout;
    result.noUnpushedCommits = unpushedCommits.stdout === "";

    if (unpushedCommits.stdout !== "")
      return { inputs, debug, result: succeeded(result) };

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
  }

  return { inputs, debug, result: succeeded(result) };
};
