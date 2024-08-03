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

const remoteLimiter = makePromiseLimiter<void>(10, "git-remote");

const doClone = async (repo: Repository, dir: string): Promise<void> => {
  const tmpTarget = `${dir}/temp:${repo.name}`;
  const finalTarget = `${dir}/${repo.name}`;

  await remoteLimiter.submit(async () => {
    console.log(`git clone ${repo.url} ${finalTarget}`);

    await runAndCapture("git", ["clone", repo.url, tmpTarget]);

    await fs.promises.rename(tmpTarget, finalTarget);
  }, repo.url);
};

const ensureMetadataPresent = async (
  repo: Repository,
  dir: string,
): Promise<void> => {
  await setMetadata(dir, repo);
};

const syncAllUnderOwnerToDir = async (
  owner: string,
  dir: string,
): Promise<void> => {
  const entries = await fs.promises.readdir(dir).catch((err) => {
    if (err.code !== "ENOENT") throw err;

    return fs.promises
      .mkdir(dir)
      .catch((err2) => {
        if (err2.code !== "EEXIST") throw err2;
      })
      .then(() => [] as string[]);
  });

  const remotes = await loadReferenceData(owner);

  const toClone: Array<{ dir: string; repo: Repository }> = [];
  const toSync: Array<{ dir: string; repo: Repository }> = [];

  for (const repo of remotes.repositories) {
    if (!entries.includes(repo.name)) {
      toClone.push({ dir, repo });
    } else {
      toSync.push({ repo, dir });
    }
  }

  await Promise.all([
    ...toClone.map((item) => doClone(item.repo, item.dir)),
    ...toSync.map((item) =>
      ensureMetadataPresent(item.repo, `${dir}/${item.repo.name}`),
    ),
  ]);
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args[0] === "--refresh") {
    args.shift();
    console.log({ refresh: { args } });
    const client = new GitHubGraphClient(process.env.GH_API_TOKEN ?? "");
    await Promise.all(args.map((owner) => freshenReferenceData(owner, client)));
  }

  console.log({ process: { args } });

  await Promise.all(
    args.map((owner) =>
      syncAllUnderOwnerToDir(owner, `${process.env.HOME}/github-${owner}-all`),
    ),
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
