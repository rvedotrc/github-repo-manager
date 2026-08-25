import { LazyTask } from "@blaahaj/lazy-task";

import type { TopLevelDir } from "../index.js";
import { failed, type SF } from "../logPromiseError.js";
import { runAndCapture } from "../runAndCapture.js";

export type WorkTree = {
  worktree: string;
  headObjectId?: string;
  branch?: string;

  bare?: boolean;
  detached?: boolean;

  locked?: { reason?: string };
  prunable?: { reason?: string };
};

export const listWorkTrees = (repoTopLevel: TopLevelDir) =>
  LazyTask.fromTask(async (): Promise<SF<{ x: 1 }, unknown>> => {
    const r = await runAndCapture(
      "git",
      ["worktree", "list", "--porcelain", "-z"],
      {
        cwd: repoTopLevel,
        requireSuccess: false,
      },
    );

    if (r.code || r.signal) return failed(r);

    throw "TODO";
  });
