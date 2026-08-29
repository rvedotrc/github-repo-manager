import { inspect } from "node:util";

import type { syncAllUnderOwnerToDir } from "./index.js";

export const buildReport = (
  syncResult: Awaited<ReturnType<typeof syncAllUnderOwnerToDir>>,
) => {
  const messages: string[] = [];
  const table: string[][] = [];

  for (const warning of [
    ...syncResult.matchData.warnings.ambiguousLocalWarnings,
    ...syncResult.matchData.warnings.nameMismatchWarnings,
    ...syncResult.matchData.warnings.somethingInTheWayPreventingClone,
  ]) {
    messages.push(`Blocker: ${warning.message}`);
  }

  for (const clone of syncResult.clones) {
    if (clone.status.tag === "succeeded") {
      messages.push(
        `INFO: Cloned ${clone.repo.owner.login}/${clone.repo.name} => ${clone.ownerDir}/${clone.repo.name}`,
      );
    } else {
      messages.push(
        `ERROR: Clone ${clone.repo.owner.login}/${clone.repo.name} => ${clone.ownerDir}/${clone.repo.name} failed: ${inspect(clone.status.reason)}`,
      );
    }
  }

  for (const sync of syncResult.syncs) {
    // console.log(JSON.stringify({ sync }));

    if (sync.result.tag === "failed") {
      messages.push(
        `ERROR: Sync ${sync.inputs?.repo.owner.login}/${sync.inputs?.repo.name} => ${sync.inputs?.repoTopLevel}/ : ${inspect(sync.result.reason)}`,
      );
      continue;
    }

    const updateLocalResult = sync.result.value;
    const result = updateLocalResult.result;

    if (result.tag === "failed") {
      messages.push(
        `ERROR: Sync ${sync.inputs.repo.owner.login}/${sync.inputs.repo.name} => ${sync.inputs.repoTopLevel}/ : ${inspect(result.reason)}`,
      );
      continue;
    }

    const props = result.value;
    const pick = (output: [string, string, string], input: boolean | null) =>
      input === null ? output[1] : input ? output[0] : output[2];

    // const githubFlags = [
    //   sync.inputs.repo.isArchived ? "a" : " ",
    //   sync.inputs.repo.isEmpty ? "e" : " ",
    //   sync.inputs.repo.isFork ? "f" : " ",
    //   sync.inputs.repo.isLocked ? "l" : " ",
    //   sync.inputs.repo.isMirror ? "m" : " ",
    //   sync.inputs.repo.isPrivate ? "p" : " ",
    //   sync.inputs.repo.isTemplate ? "t" : " ",
    //   sync.inputs.repo.visibility.padEnd(10),
    // ];

    const githubFlagsFull = [
      sync.inputs.repo.isPrivate && "private",
      sync.inputs.repo.isLocked && "locked",
      sync.inputs.repo.isEmpty && "empty",
      sync.inputs.repo.isFork && "fork",
      sync.inputs.repo.isMirror && "mirror",
      sync.inputs.repo.isTemplate && "template",
      sync.inputs.repo.isArchived && "archive",
    ]
      .filter((s) => typeof s === "string")
      .join(" ")
      .padEnd(20);

    const analysis = [
      pick(["f", "~", " "], props.fetched?.fetched ?? null),
      pick(["u", "~", " "], props.fastForwardMerged),
      pick([" ", "~", "B"], props.onDefaultBranch),
      pick([" ", "~", "P"], props.nothingInProgress),
      pick([" ", "~", "M"], props.gitStatusExcludingUntrackedIsClean),
      pick([" ", "~", "U"], props.gitStatusNothingUntracked),
    ];

    table.push([
      // githubFlags.join(" "),
      githubFlagsFull,
      "|",
      analysis.join(" "),
      "|",
      props.defaultBranchState ?? "~",
      "|",
      `${sync.inputs.repo.owner.login}/${sync.inputs.repo.name}`,
    ]);

    // console.dir(updateLocalResult, { depth: 5 });
  }

  return {
    table,
    messages,
  };
};

export const explainReport = () => {
  console.log(
    [
      "",
      "Legend:",
      "",
      "  f = fetched",
      "  u = fast-forward merged",
      "",
      "  B = not on default branch",
      "  P = merge, rebase etc in progress",
      "  M = something is modified",
      "  ? = something is untracked (only shown if not 'M')",
      "",
      "  ~ = error",
    ].join("\n"),
  );
};

export const showReport = (report: ReturnType<typeof buildReport>) => {
  const { table, messages } = report;

  const maxWidths: number[] = [];
  for (const row of table) {
    row.forEach((cell, i) => {
      const l = cell.length;
      if (maxWidths[i] === undefined || maxWidths[i] < l) maxWidths[i] = l;
    });
  }

  table.sort((a, b) => a[a.length - 1].localeCompare(b[b.length - 1]));

  for (const row of table) {
    const padded = row.map((value, i) => value.padEnd(maxWidths[i]));
    console.log(padded.join(" ").trimEnd());
  }

  console.log(`
Legend:
    f = was fetched
    u = was fast-forwarded
    B = on a non-default branch
    P = merge, rebase, etc in progress
    M = non-clean git status (excluding untracked)
    U = something is untracked
`);

  for (const message of messages) console.log(message);
};

export const aggregateReports = (
  reports: readonly ReturnType<typeof buildReport>[],
): ReturnType<typeof buildReport> => {
  return {
    table: reports.flatMap((r) => r.table),
    messages: reports.flatMap((r) => r.messages),
  };
};
