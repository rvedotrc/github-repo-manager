import * as fs from "fs";
import { runAndCapture } from "./runAndCapture.js";
import {
  freshenReferenceData,
  loadReferenceData,
  Repository,
} from "./referenceData.js";
import { getMetadata, Metadata, setMetadata } from "./metadata.js";
import { makePromiseLimiter } from "./promiseLimiter.js";
import { GitHubGraphClient } from "./gitHubGraphClient";
import { GitConfig, readGitConfig } from "./gitConfig";
import { loadLocalRepositories, LocalInfo } from "./locals";
import { matchLocalsToRemotes } from "./matcher";

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
  const locals = await loadLocalRepositories(ownerDir);
  const remotes = (await loadReferenceData(owner)).repositories;

  const matchData = matchLocalsToRemotes(ownerDir, locals, remotes);

  await Promise.all([
    ...matchData.results.toClone.map((item) => doClone(item, ownerDir)),
    ...matchData.results.pairedLocalsAndRemotes.map((item) =>
      doSync(item.remote, item.local.topLevel),
    ),
  ]);

  for (const warning of matchData.warnings.ambiguousLocalWarnings) {
    console.warn(warning.message);
  }

  for (const warning of matchData.warnings.nameMismatchWarnings) {
    console.warn(warning.message);
  }

  for (const warning of matchData.warnings.somethingInTheWayPreventingClone) {
    console.warn(warning.message);
  }

  for (const local of matchData.results.unmatchedLocals) {
    if (!local.isGit) {
      console.warn(
        `Unexpected item found; consider removing: rm -rf ${local.childPath}`,
      );
    } else if (local.metadata.url) {
      console.warn(
        `Found git repository '${local.childPath}', marked as a clone of ${local.metadata.url}, but that remote doesn't exist. Perhaps it got deleted? Consider removing: rm -rf ${local.childPath}`,
      );
    } else {
      console.warn(
        `Found git repository '${local.childPath}', but with no matching remote. Maybe it's still waiting for its first push?`,
      );
    }
  }
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args[0] === "--refresh") {
    args.shift();
    const client = new GitHubGraphClient(process.env.GH_API_TOKEN ?? "");
    await Promise.all(
      args.map((owner) => freshenReferenceData(owner as OwnerLogin, client)),
    );
  }

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
