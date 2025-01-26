import { currentBranchName } from "./currentBranchName.js";
import { gitStatusPorcelain } from "./gitStatusPorcelain.js";
import { localAndRemoteHeads } from "./localAndRemoteHeads.js";
import { listRefs } from "./listRefs.js";
import { workingTreeStatus } from "./workingTreeStatus.js";

export const tasks = {
  currentBranchName,
  gitStatusPorcelain,
  listRefs,
  localAndRemoteHeads,
  workingTreeStatus,
};
