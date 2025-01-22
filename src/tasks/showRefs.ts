import { LazyTask } from "@blaahaj/lazy-task";
import type { TopLevelDir } from "../index.js";
import { runAndCapture } from "../runAndCapture.js";

export const showRefs = (repoTopLevel: TopLevelDir) =>
  LazyTask.fromTask(async () => {
    const r = await runAndCapture("git", ["for-each-ref"], {
      cwd: repoTopLevel,
    });
    const lines = r.stdout.trimEnd().split("\n");

    const out = new Map<string, { objectId; objectType }>();

    for (const line of lines) {
      const [objectIdAndType, ref] = line.split("\t");
      const [objectId, objectType] = objectIdAndType.split(" ");
      out.set(ref, { objectId, objectType });
    }

    return out;
  });
