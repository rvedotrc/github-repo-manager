import * as fs from "fs";

import { loadLocalRepositories } from "./locals.js";
import { matchLocalsToRemotes } from "./matcher.js";
import { setMetadata } from "./metadata.js";
import { makePromiseLimiter } from "./promiseLimiter.js";
import { loadReferenceData, type Repository } from "./referenceData.js";
// import { updateLocal } from "./updateLocal.js";
import {
  failed,
  NONE,
  succeeded,
  type SFWithContext,
} from "./logPromiseError.js";
import { runAndCapture } from "./runAndCapture.js";
import { rm } from "fs/promises";
import { updateLocal, type UpdateLocalResult } from "./updateLocal.js";
import type { GitConfig } from "./gitConfig.js";

export type OwnerLogin = string & { readonly tag: unique symbol };
export type OwnerDir = string & { readonly tag: unique symbol };
export type TopLevelDir = string & { readonly tag: unique symbol };
const remoteLimiter = makePromiseLimiter(10, "git-remote");

const doClone = async (repo: Repository, ownerDir: OwnerDir) => {
  const tmpTarget = `${ownerDir}/temp:${repo.name}`;
  const finalTarget = `${ownerDir}/${repo.name}`;

  try {
    await remoteLimiter.submit(
      () => runAndCapture("git", ["clone", repo.url, tmpTarget]),
      repo.url,
    );

    await fs.promises.rename(tmpTarget, finalTarget);

    await setMetadata(finalTarget as TopLevelDir, repo);

    return {
      repo,
      ownerDir,
      status: succeeded(NONE),
    } as const;
  } catch (err: unknown) {
    return {
      repo,
      ownerDir,
      status: failed(err),
    } as const;
  } finally {
    void rm(tmpTarget, { recursive: true, force: true });
  }
};

export type DoSyncResult = SFWithContext<
  { repo: Repository; repoTopLevel: TopLevelDir },
  UpdateLocalResult,
  unknown
>;

const doSync = (
  repo: Repository,
  repoTopLevel: TopLevelDir,
  localConfig: GitConfig,
): Promise<DoSyncResult> =>
  setMetadata(repoTopLevel, repo).then(
    (mdValue) =>
      updateLocal(repoTopLevel, repo, remoteLimiter, localConfig).then(
        (ulValue) => ({
          inputs: { repo, repoTopLevel },
          debug: { mdValue },
          result: succeeded(ulValue),
        }),
        (ulReason: unknown) => ({
          inputs: { repo, repoTopLevel },
          debug: { mdValue },
          result: failed(ulReason),
        }),
      ),
    (mdReason: unknown) => ({
      inputs: { repo, repoTopLevel },
      debug: undefined,
      result: failed(mdReason),
    }),
  );

export const syncAllUnderOwnerToDir = async (
  owner: OwnerLogin,
  ownerDir: OwnerDir,
) => {
  const locals = await loadLocalRepositories(ownerDir);
  const remotes = (await loadReferenceData(owner)).repositories.filter(
    (r) => r.owner.login === owner,
  );

  const matchData = matchLocalsToRemotes(ownerDir, locals, remotes);

  const r0 = {
    owner,
    ownerDir,
    locals,
    remotes,
    matchData,
  };

  const clones = Promise.all(
    matchData.results.toClone.map((item) => doClone(item, ownerDir)),
  );

  const syncs = Promise.all(
    matchData.results.pairedLocalsAndRemotes.map((item) =>
      doSync(item.remote, item.local.topLevel, item.local.config),
    ),
  );

  const r1 = {
    ...r0,
    clones: await clones,
    syncs: await syncs,
  };

  return r1;
};
