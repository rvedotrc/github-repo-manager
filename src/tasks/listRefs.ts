import { LazyTask } from "@blaahaj/lazy-task";

import type { TopLevelDir } from "../index.js";
import { failed, succeeded } from "../logPromiseError.js";
import { runAndCapture } from "../runAndCapture.js";

export const listRefs = (repoTopLevel: TopLevelDir) =>
  LazyTask.fromTask(async () => {
    const r = await runAndCapture("git", ["for-each-ref"], {
      cwd: repoTopLevel,
      requireSuccess: false,
    });

    if (r.code || r.signal) return failed(r);

    const lines = r.stdout.trimEnd().split("\n");

    const out = new Map<
      string,
      { readonly objectId: string; readonly objectType: string }
    >();

    for (const line of lines) {
      const [objectIdAndType, ref] = line.split("\t");
      const [objectId, objectType] = objectIdAndType.split(" ");
      out.set(ref, { objectId, objectType });
    }

    return succeeded(out);
  });
