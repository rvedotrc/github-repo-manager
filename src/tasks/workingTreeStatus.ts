import { LazyTask } from "@blaahaj/lazy-task";
import type { TopLevelDir } from "../index.js";
import { checkWorkingTreeStatus } from "@blaahaj/got-to-git";

// Can fail, but only if error other than ENOENT comes up (e.g. EPERM or EISDIR)
export const workingTreeStatus = (repoTopLevel: TopLevelDir) =>
  LazyTask.fromTask(() => checkWorkingTreeStatus(repoTopLevel));
