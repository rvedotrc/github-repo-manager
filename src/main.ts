import { inspect } from "node:util";
import { GitHubGraphClient } from "./gitHubGraphClient.js";
import {
  syncAllUnderOwnerToDir,
  type OwnerDir,
  type OwnerLogin,
} from "./index.js";
import { freshenReferenceData, type ReferenceData } from "./referenceData.js";

const main = async () => {
  const args = process.argv.slice(2);

  const r0 = {
    args,
    refreshResult: null as readonly ReferenceData[] | null,
  };

  if (args[0] === "--refresh") {
    args.shift();
    const client = new GitHubGraphClient(process.env.GH_API_TOKEN ?? "");
    r0.refreshResult = await Promise.all(
      args.map((owner) => freshenReferenceData(owner as OwnerLogin, client)),
    );
  }

  const syncResults = await Promise.all(
    args.map((owner) =>
      syncAllUnderOwnerToDir(
        owner as OwnerLogin,
        `${process.env.HOME}/git/github.com/${owner}` as OwnerDir,
      ).catch(),
    ),
  );

  const finalResult = {
    ...r0,
    syncResults,
  };

  console.log("args were:", finalResult.args);
  console.log(
    "GitHub repo data refreshed:",
    finalResult.refreshResult ? "yes" : "no",
  );
  for (const syncResult of finalResult.syncResults) {
    console.log("");
    console.log(
      `Sync results for ${syncResult.owner} into ${syncResult.ownerDir}:`,
    );

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
          `INFO: Clone ${clone.repo.owner.login}/${clone.repo.name} => ${clone.ownerDir}/ ${inspect(clone.status.value)}`,
        );
      } else {
        messages.push(
          `ERROR: Clone ${clone.repo.owner.login}/${clone.repo.name} => ${clone.ownerDir}/ : ${inspect(clone.status.reason)}`,
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
        pick([" ", "~", "B"], props.onDefaultBranch),
        pick([" ", "~", "P"], props.nothingInProgress),
        pick(
          [
            " ",
            "~",
            pick(["?", "~", "M"], props.gitStatusExcludingUntrackedIsClean),
          ],
          props.gitStatusIsClean,
        ),
        pick(["u", "~", " "], props.fastForwardMerged),
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

    for (const message of messages) console.log(message);
  }

  // console.log(JSON.stringify(finalResult, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
