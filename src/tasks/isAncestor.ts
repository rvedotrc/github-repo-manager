import { LazyTask } from "@blaahaj/lazy-task";
import type { TopLevelDir } from "../index.js";
import { runAndCapture } from "../runAndCapture.js";
import { failed, succeeded, type SF } from "../logPromiseError.js";

export const isAncestor = (
  repoTopLevel: TopLevelDir,
  commitA: string,
  commitB: string,
) =>
  LazyTask.fromTask(async (): Promise<SF<boolean, unknown>> => {
    const r = await runAndCapture(
      "git",
      ["merge-base", "--is-ancestor", commitA, commitB],
      {
        cwd: repoTopLevel,
        requireSuccess: false,
      },
    );

    if (r.stdout === "" && r.stderr === "" && (r.code === 0 || r.code === 1)) {
      return succeeded(r.code === 0);
    }

    return failed(r);
  });
