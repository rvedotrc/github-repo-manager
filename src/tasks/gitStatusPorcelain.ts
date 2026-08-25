import { LazyTask } from "@blaahaj/lazy-task";

import type { TopLevelDir } from "../index.js";
import { failed, succeeded } from "../logPromiseError.js";
import { runAndCapture } from "../runAndCapture.js";

export const gitStatusPorcelain = (repoTopLevel: TopLevelDir) =>
  LazyTask.fromTask(async () => {
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
  });
