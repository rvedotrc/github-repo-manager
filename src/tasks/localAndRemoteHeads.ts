import { LazyTask } from "@blaahaj/lazy-task";

import type { TopLevelDir } from "../index.js";
import { failed, type SF, succeeded } from "../logPromiseError.js";
import { runAndCapture } from "../runAndCapture.js";

export const localAndRemoteHeads = (
  repoTopLevel: TopLevelDir,
  defaultBranchRef: string,
  remoteName: string,
) =>
  LazyTask.fromTask(
    async (): Promise<
      SF<{ localHash: string; remoteHash: string }, unknown>
    > => {
      const r = await runAndCapture(
        "git",
        [
          "rev-parse",
          // FIXME: no such thing as the "default branch" locally.
          // We should be finding which local branch it is which has the
          // remote's default as an upstream.

          // FIXME: doesn't handle the no-commits case.
          // Should switch to for-each-ref instead.
          `refs/heads/${defaultBranchRef}`,
          `refs/remotes/${remoteName}/${defaultBranchRef}`,
        ],
        { cwd: repoTopLevel, requireSuccess: false },
      );

      if (r.code || r.signal) return failed(r);

      const m = r.stdout.match(/^(\S+)\n(\S+)\n$/);
      const localHash = m?.[1] as string;
      const remoteHash = m?.[2] as string;

      return succeeded({ localHash, remoteHash });
    },
  );
