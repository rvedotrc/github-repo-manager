import * as fs from "fs";
import { runAndCapture } from "./runAndCapture.js";
import {
  freshenReferenceData,
  loadReferenceData,
  Repository,
} from "./referenceData.js";
import { setMetadata } from "./metadata.js";
import { makePromiseLimiter } from "./promiseLimiter.js";
import { GitHubGraphClient } from "./gitHubGraphClient";

export type OwnerLogin = string & { readonly tag: unique symbol };
export type OwnerDir = string & { readonly tag: unique symbol };
export type TopLevelDir = string & { readonly tag: unique symbol };

const remoteLimiter = makePromiseLimiter<void>(10, "git-remote");

const doClone = async (repo: Repository, ownerDir: OwnerDir): Promise<void> => {
  const tmpTarget = `${ownerDir}/temp:${repo.name}`;
  const finalTarget = `${ownerDir}/${repo.name}`;

  await remoteLimiter.submit(async () => {
    console.log(`git clone ${repo.url} ${finalTarget}`);

    await runAndCapture("git", ["clone", repo.url, tmpTarget]);

    await fs.promises.rename(tmpTarget, finalTarget);
  }, repo.url);

  await setMetadata(finalTarget as TopLevelDir, repo);
};

const doSync = async (
  repo: Repository,
  repoTopLevel: TopLevelDir,
): Promise<void> => {
  await setMetadata(repoTopLevel, repo);
};

const syncAllUnderOwnerToDir = async (
  owner: OwnerLogin,
  ownerDir: OwnerDir,
): Promise<void> => {
  const entries = await fs.promises.readdir(ownerDir).catch((err) => {
    if (err.code !== "ENOENT") throw err;

    return fs.promises
      .mkdir(ownerDir)
      .catch((err2) => {
        if (err2.code !== "EEXIST") throw err2;
      })
      .then(() => [] as string[]);
  });

  const remotes = await loadReferenceData(owner);

  const toClone: Array<{ ownerDir: OwnerDir; repo: Repository }> = [];
  const toSync: Array<{ ownerDir: OwnerDir; repo: Repository }> = [];

  for (const repo of remotes.repositories) {
    if (!entries.includes(repo.name)) {
      toClone.push({ ownerDir, repo });
    } else {
      toSync.push({ ownerDir, repo });
    }
  }

  await Promise.all([
    ...toClone.map((item) => doClone(item.repo, item.ownerDir)),
    ...toSync.map((item) =>
      doSync(item.repo, `${ownerDir}/${item.repo.name}` as TopLevelDir),
    ),
  ]);
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args[0] === "--refresh") {
    args.shift();
    console.log({ refresh: { args } });
    const client = new GitHubGraphClient(process.env.GH_API_TOKEN ?? "");
    await Promise.all(
      args.map((owner) => freshenReferenceData(owner as OwnerLogin, client)),
    );
  }

  console.log({ process: { args } });

  await Promise.all(
    args.map((owner) =>
      syncAllUnderOwnerToDir(
        owner as OwnerLogin,
        `${process.env.HOME}/github-${owner}-all` as OwnerDir,
      ),
    ),
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
