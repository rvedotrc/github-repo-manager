import { currentBranchName } from "./currentBranchName.js";
import { gitStatusPorcelain } from "./gitStatusPorcelain.js";
import { localAndRemoteHeads } from "./localAndRemoteHeads.js";
import { workingTreeStatus } from "./workingTreeStatus.js";

export const tasks = {
  currentBranchName,
  gitStatusPorcelain,
  localAndRemoteHeads,
  workingTreeStatus,
};
