import { LazyTask } from "@blaahaj/lazy-task";
import type { TopLevelDir } from "../index.js";
import { runAndCapture } from "../runAndCapture.js";
import { failed, succeeded, type SF } from "../logPromiseError.js";

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
        ["rev-parse", "HEAD", `refs/remotes/${remoteName}/${defaultBranchRef}`],
        { cwd: repoTopLevel, requireSuccess: false },
      );

      if (r.code || r.signal) return failed(r);

      const m = r.stdout.match(/^(\S+)\n(\S+)\n$/);
      const localHash = m?.[1] as string;
      const remoteHash = m?.[2] as string;

      return succeeded({ localHash, remoteHash });
    },
  );
