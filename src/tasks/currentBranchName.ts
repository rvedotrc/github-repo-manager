import { LazyTask } from "@blaahaj/lazy-task";

import type { TopLevelDir } from "../index.js";
import { failed, type SF, succeeded } from "../logPromiseError.js";
import { runAndCapture } from "../runAndCapture.js";

export const currentBranchName = (repoTopLevel: TopLevelDir) =>
  LazyTask.fromTask(async (): Promise<SF<string, unknown>> => {
    const headStatus = await runAndCapture("git", ["symbolic-ref", "HEAD"], {
      cwd: repoTopLevel,
      requireSuccess: false,
    });

    if (headStatus.code || headStatus.signal) return failed({ headStatus });

    const headRef = headStatus.stdout.trimEnd();

    return succeeded(headRef);
  });
