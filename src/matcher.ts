import { OwnerDir } from "./index";
import { LocalGitInfo, LocalInfo } from "./locals";
import { Repository } from "./referenceData";

export type LocalRemoteMatchData = NonNullable<{
  results: Readonly<{
    pairedLocalsAndRemotes: ReadonlyArray<
      Readonly<{
        local: LocalGitInfo;
        remote: Repository;
      }>
    >;
    toClone: ReadonlyArray<Repository>;
    unmatchedLocals: ReadonlyArray<LocalInfo>;
  }>;
  warnings: Readonly<{
    ambiguousLocalWarnings: ReadonlyArray<
      Readonly<{
        message: string;
        locals: ReadonlyArray<LocalGitInfo>;
        remote: Repository;
      }>
    >;
    somethingInTheWayPreventingClone: ReadonlyArray<
      Readonly<{
        message: string;
        locals: ReadonlyArray<LocalInfo>;
        remote: Repository;
      }>
    >;
    nameMismatchWarnings: ReadonlyArray<
      Readonly<{
        message: string;
        local: LocalGitInfo;
        remote: Repository;
      }>
    >;
  }>;
}>;

export const matchLocalsToRemotes = (
  ownerDir: OwnerDir,
  locals: ReadonlyArray<LocalInfo>,
  remotes: ReadonlyArray<Repository>,
): LocalRemoteMatchData => {
  const unmatchedLocals = [...locals];
  const unmatchedRemotes: Repository[] = [];
  const pairedLocalsAndRemotes: Array<
    LocalRemoteMatchData["results"]["pairedLocalsAndRemotes"][number]
  > = [];
  const ambiguousLocalWarnings: Array<
    LocalRemoteMatchData["warnings"]["ambiguousLocalWarnings"][number]
  > = [];

  for (const remote of remotes) {
    const matches = unmatchedLocals.flatMap((local, index) =>
      local.isGit && local.metadata.id === remote.id
        ? [{ local, index }]
        : ([] as const),
    );

    if (matches.length === 1) {
      const { local, index } = matches[0];
      pairedLocalsAndRemotes.push({ local, remote });
      unmatchedLocals.splice(index, 1);
    } else if (matches.length > 1) {
      ambiguousLocalWarnings.push({
        message: `Multiple local repositories in ${ownerDir} match ${remote.url} (${matches
          .map((item) => item.local.name)
          .sort()
          .join(", ")}). Skipping this remote and these locals.`,
        locals: matches.map((item) => item.local),
        remote,
      });
      for (const m of matches.toReversed()) {
        unmatchedLocals.splice(m.index, 1);
      }
    } else {
      unmatchedRemotes.push(remote);
    }
  }

  // paired == local-remote pairings by ID; but if a repo got renamed,
  // then the local name (and childPath and topLevel) might not match
  // the remote's name. We don't attempt to fix them; just warn.
  const nameMismatchWarnings = pairedLocalsAndRemotes
    .filter((item) => item.local.name !== item.remote.name)
    .map((item) => ({
      message: `${item.remote.url} matches ${item.local.childPath} (expected: ${ownerDir}/${item.remote.name}). Sync will proceed anyway.`,
      ...item,
    }));

  // unmatchedRemotes = remotes we want to clone, _but_ we don't yet know
  // if there's something in the way locally with the same name
  const toClone: Repository[] = [];

  const somethingInTheWayPreventingClone: Array<
    LocalRemoteMatchData["warnings"]["somethingInTheWayPreventingClone"][number]
  > = [];

  for (const remote of unmatchedRemotes) {
    const thingsInTheWay = locals.filter(
      (item) =>
        item.name.toLocaleLowerCase() === remote.name.toLocaleLowerCase(),
    );

    if (thingsInTheWay.length > 0) {
      somethingInTheWayPreventingClone.push({
        message: `Want to clone ${remote.url}, but can't, because ${thingsInTheWay[0].childPath} is in the way`,
        locals: thingsInTheWay,
        remote,
      });
    } else {
      toClone.push(remote);
    }
  }

  // unmatchedLocals could be a mix of:
  // - non-directories;
  // - non-git directories;
  // - git directories without our metadata;
  // - git directories with our metadata, but which doesn't match a remote (maybe the remote got deleted)

  return {
    results: {
      pairedLocalsAndRemotes,
      toClone,
      unmatchedLocals,
    },
    warnings: {
      ambiguousLocalWarnings,
      nameMismatchWarnings,
      somethingInTheWayPreventingClone,
    },
  };
};
