import * as fs from "fs";
import { runAndCapture } from "./runAndCapture";

type Repository = {
  readonly id: string;
  readonly name: string;
  readonly owner: {
    readonly login: string;
  };
  readonly visibility: string; // actually an enum
  readonly defaultBranchRef?: {
    readonly name: string;
  };
  readonly url: string;

  readonly isArchived: boolean;
  readonly isEmpty: boolean;
  readonly isFork: boolean;
  readonly isLocked: boolean;
  readonly isMirror: boolean;
  readonly isPrivate: boolean;
  readonly isTemplate: boolean;

  readonly createdAt: string; // datetime
  readonly updatedAt?: string; // datetime
  readonly pushedAt?: string; // datetime
  readonly archivedAt?: string; // datetime
};

type ReferenceData = {
  readonly repositories: ReadonlyArray<Repository>;
};

const CONFIG_GITHUB_REPOSITORY_ID = "github.repo.id";
const CONFIG_GITHUB_REPOSITORY_NAME = "github.repo.name";
const CONFIG_GITHUB_REPOSITORY_OWNER_LOGIN = "github.repo.owner.login";
const CONFIG_GITHUB_REPOSITORY_VISIBILITY = "github.repo.visibility";
const CONFIG_GITHUB_REPOSITORY_DEFAULT_BRANCH_REF_NAME =
  "github.repo.defaultbranchref.name";
const CONFIG_GITHUB_REPOSITORY_URL = "github.repo.url";

const CONFIG_GITHUB_REPOSITORY_IS_ARCHIVED = "github.repo.isarchived";
const CONFIG_GITHUB_REPOSITORY_IS_EMPTY = "github.repo.isempty";
const CONFIG_GITHUB_REPOSITORY_IS_FORK = "github.repo.isfork";
const CONFIG_GITHUB_REPOSITORY_IS_LOCKED = "github.repo.islocked";
const CONFIG_GITHUB_REPOSITORY_IS_MIRROR = "github.repo.ismirror";
const CONFIG_GITHUB_REPOSITORY_IS_PRIVATE = "github.repo.isprivate";
const CONFIG_GITHUB_REPOSITORY_IS_TEMPLATE = "github.repo.istemplate";

const CONFIG_GITHUB_REPOSITORY_CREATED_AT = "github.repo.createdat";
const CONFIG_GITHUB_REPOSITORY_UPDATED_AT = "github.repo.updatedat";
const CONFIG_GITHUB_REPOSITORY_PUSHED_AT = "github.repo.pushedat";
const CONFIG_GITHUB_REPOSITORY_ARCHIVED_AT = "github.repo.archivedat";

const loadReferenceData = (dir: string): Promise<ReferenceData> =>
  fs.promises
    .readFile(`${dir}/var/repositories.json`, "utf-8")
    .then((text) => JSON.parse(text));

const doClone = async (repo: Repository, dir: string): Promise<void> => {
  const tmpTarget = `${dir}/temp:${repo.name}`;
  const finalTarget = `${dir}/${repo.name}`;

  await runAndCapture("git", ["clone", repo.url, tmpTarget]);

  await fs.promises.rename(tmpTarget, finalTarget);
};

const ensureConfig = async (
  key: string,
  value: string,
  dir: string,
  config: Readonly<Record<string, string>>,
): Promise<void> => {
  if (config[key] === value) return;

  console.log(`${dir}: git config ${key} ${value}`);
  await runAndCapture("git", ["config", key, value], { cwd: dir });
};

const ensureMetadataPresent = async (
  repo: Repository,
  dir: string,
): Promise<void> => {
  const configText = (
    await runAndCapture("git", ["config", "--list", "--local"], { cwd: dir })
  ).stdout;

  const pairs = [...configText.matchAll(/^(.*?)=(.*)\n/gm)].map((match) => ({
    key: match[1],
    value: match[2],
  }));

  const config = pairs.reduce(
    (prev, curr) => ({
      ...prev,
      [curr.key]: curr.value,
    }),
    {},
  );

  console.dir(config);

  await ensureConfig(CONFIG_GITHUB_REPOSITORY_ID, repo.id, dir, config);
  await ensureConfig(CONFIG_GITHUB_REPOSITORY_NAME, repo.name, dir, config);
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_OWNER_LOGIN,
    repo.owner.login,
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_DEFAULT_BRANCH_REF_NAME,
    repo.defaultBranchRef?.name ?? "",
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_VISIBILITY,
    repo.visibility,
    dir,
    config,
  );
  await ensureConfig(CONFIG_GITHUB_REPOSITORY_URL, repo.url, dir, config);

  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_ARCHIVED,
    repo.isArchived ? "true" : "false",
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_EMPTY,
    repo.isEmpty ? "true" : "false",
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_FORK,
    repo.isFork ? "true" : "false",
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_LOCKED,
    repo.isLocked ? "true" : "false",
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_MIRROR,
    repo.isMirror ? "true" : "false",
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_PRIVATE,
    repo.isPrivate ? "true" : "false",
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_TEMPLATE,
    repo.isTemplate ? "true" : "false",
    dir,
    config,
  );

  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_CREATED_AT,
    repo.createdAt,
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_UPDATED_AT,
    repo.updatedAt ?? "",
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_PUSHED_AT,
    repo.pushedAt ?? "",
    dir,
    config,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_ARCHIVED_AT,
    repo.archivedAt ?? "",
    dir,
    config,
  );
};

const syncAllUnderOwnerToDir = async (
  owner: string,
  dir: string,
): Promise<void> => {
  const entries = await fs.promises.readdir(dir);
  console.dir(entries);

  const remotes = await loadReferenceData(".");
  console.dir(remotes.repositories.map((r) => r.name));

  for (const repo of remotes.repositories) {
    if (!entries.includes(repo.name)) {
      await doClone(repo, dir);
    } else {
      console.log(
        `${dir}/${repo.name} already exists (hopefully it's a clone)`,
      );
      await ensureMetadataPresent(repo, `${dir}/${repo.name}`);
    }
  }
};

syncAllUnderOwnerToDir(
  "rvedotrc",
  `${process.env.HOME}/github-rvedotrc-all`,
).catch((err) => {
  console.error(err);
  process.exit(1);
});
