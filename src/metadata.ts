import type { RepositoryVisibility } from "../generated/graphql/graphql.js";
import { ensureConfig, GitConfig, readGitConfig } from "./gitConfig.js";
import { TopLevelDir } from "./index.js";
import { Repository } from "./referenceData.js";

type Mappings = Partial<{
  [k in keyof Repository]: {
    readonly configName?: string;
    readonly writeMapper: (value: Repository[k]) => string | boolean;
    readonly readMapper: (
      value: string | undefined,
    ) => Repository[k] | undefined;
  };
}>;

const stringMappings = {
  writeMapper: (value: string | undefined) => value ?? "",
  readMapper: (value: string | undefined) => value || undefined,
} as const;

const booleanMappings = {
  writeMapper: (value: boolean) => value.toString(),
  readMapper: (value: string | undefined) => value === "true",
};

const mappings: Mappings = {
  id: stringMappings,
  name: stringMappings,
  owner: {
    configName: "owner.login",
    readMapper: (v) => (v ? { login: v } : undefined),
    writeMapper: (v) => v.login ?? "",
  },
  visibility: {
    readMapper: (v) => (v ? (v as RepositoryVisibility) : undefined),
    writeMapper: (v) => v,
  },
  defaultBranchRef: {
    configName: "defaultbranchref.name",
    readMapper: (v) => (v ? { name: v } : undefined),
    writeMapper: (v) => v?.name ?? "",
  },
  url: stringMappings,

  isArchived: booleanMappings,
  isEmpty: booleanMappings,
  isFork: booleanMappings,
  isLocked: booleanMappings,
  isMirror: booleanMappings,
  isPrivate: booleanMappings,
  isTemplate: booleanMappings,

  createdAt: stringMappings,
  updatedAt: stringMappings,
  pushedAt: stringMappings,
  archivedAt: stringMappings,
} as const;

export type WorkingMetadata = Partial<Pick<Repository, keyof Mappings>>;
export type Metadata = Readonly<Partial<Pick<Repository, keyof Mappings>>>;

export const setMetadata = async (
  topLevelDir: TopLevelDir,
  repo: Repository,
): Promise<void> => {
  const currentGitConfig = await readGitConfig(topLevelDir);

  for (const [k, mapping] of Object.entries(mappings)) {
    const configName = mapping.configName ?? k;
    const fullConfigName = `github.repo.${configName.toLocaleLowerCase()}`;
    const writeMapper = mapping.writeMapper as (
      value: unknown,
    ) => string | boolean;
    const value = writeMapper(repo[k]);

    await ensureConfig(
      fullConfigName,
      value.toString(),
      topLevelDir,
      currentGitConfig,
    );
  }
};

export const getMetadata = (gitConfig: GitConfig): Metadata => {
  const metadata: WorkingMetadata = {};

  for (const [key, mapping] of Object.entries(mappings)) {
    const configName = mapping.configName ?? key;
    const fullConfigName = `github.repo.${configName.toLocaleLowerCase()}`;
    const readMapper = mapping.readMapper as (
      value: string | undefined,
    ) => unknown;
    const value = readMapper(gitConfig[fullConfigName]);
    metadata[key] = value;
  }

  return metadata;
};
