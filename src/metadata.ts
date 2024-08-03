import { ensureConfig, readGitConfig } from "./gitConfig.js";
import { Repository } from "./referenceData.js";
import { TopLevelDir } from "./index";

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

export const setMetadata = async (
  topLevelDir: TopLevelDir,
  repo: Repository,
): Promise<void> => {
  const currentGitConfig = await readGitConfig(topLevelDir);

  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_ID,
    repo.id,
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_NAME,
    repo.name,
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_OWNER_LOGIN,
    repo.owner.login,
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_DEFAULT_BRANCH_REF_NAME,
    repo.defaultBranchRef?.name ?? "",
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_VISIBILITY,
    repo.visibility,
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_URL,
    repo.url,
    topLevelDir,
    currentGitConfig,
  );

  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_ARCHIVED,
    repo.isArchived ? "true" : "false",
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_EMPTY,
    repo.isEmpty ? "true" : "false",
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_FORK,
    repo.isFork ? "true" : "false",
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_LOCKED,
    repo.isLocked ? "true" : "false",
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_MIRROR,
    repo.isMirror ? "true" : "false",
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_PRIVATE,
    repo.isPrivate ? "true" : "false",
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_IS_TEMPLATE,
    repo.isTemplate ? "true" : "false",
    topLevelDir,
    currentGitConfig,
  );

  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_CREATED_AT,
    repo.createdAt,
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_UPDATED_AT,
    repo.updatedAt ?? "",
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_PUSHED_AT,
    repo.pushedAt ?? "",
    topLevelDir,
    currentGitConfig,
  );
  await ensureConfig(
    CONFIG_GITHUB_REPOSITORY_ARCHIVED_AT,
    repo.archivedAt ?? "",
    topLevelDir,
    currentGitConfig,
  );
};
