import fs from "fs";

import { GitConfig, readGitConfig } from "./gitConfig";
import { OwnerDir, TopLevelDir } from "./index";
import { getMetadata, Metadata } from "./metadata";
import { runAndCapture } from "./runAndCapture";

export type LocalNonGitInfo = {
  readonly name: string;
  readonly childPath: string;
  readonly stat: fs.Stats;
  readonly isGit: false;
};

export type LocalGitInfo = {
  readonly name: string;
  readonly childPath: string;
  readonly stat: fs.Stats;
  readonly isGit: true;
  readonly topLevel: TopLevelDir;
  readonly config: GitConfig;
  readonly metadata: Metadata;
};

export type LocalInfo = LocalNonGitInfo | LocalGitInfo;

export const loadLocalRepositories = async (
  ownerDir: OwnerDir,
): Promise<ReadonlyArray<LocalInfo>> => {
  const entries = await fs.promises.readdir(ownerDir).catch((err) => {
    if (err.code !== "ENOENT") throw err;

    return fs.promises
      .mkdir(ownerDir)
      .catch((err2) => {
        if (err2.code !== "EEXIST") throw err2;
      })
      .then(() => [] as string[]);
  });

  return Promise.all(
    entries.map(async (name): Promise<LocalInfo> => {
      const childPath = `${ownerDir}/${name}`;
      const stat = await fs.promises.lstat(childPath);

      if (stat.isDirectory()) {
        const output = await runAndCapture(
          "git",
          ["rev-parse", "--show-toplevel"],
          { cwd: childPath, requireSuccess: false },
        );

        if (output.code === 0 && output.stdout === childPath + "\n") {
          const topLevel = childPath as TopLevelDir;
          const config = await readGitConfig(topLevel);
          const metadata = getMetadata(config);

          return {
            name,
            childPath,
            stat,
            isGit: true,
            topLevel,
            config,
            metadata,
          };
        }
      }

      return { name, childPath, stat, isGit: false };
    }),
  );
};
