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

    for (const warning of [
      ...syncResult.matchData.warnings.ambiguousLocalWarnings,
      ...syncResult.matchData.warnings.nameMismatchWarnings,
      ...syncResult.matchData.warnings.somethingInTheWayPreventingClone,
    ]) {
      console.log(`Blocker: ${warning.message}`);
    }

    for (const clone of syncResult.clones) {
      if (clone.status.tag === "succeeded") {
        console.log(
          `INFO: Clone ${clone.repo.owner.login}/${clone.repo.name} => ${clone.ownerDir}/`,
          clone.status.value,
        );
      } else {
        console.log(
          `ERROR: Clone ${clone.repo.owner.login}/${clone.repo.name} => ${clone.ownerDir}/ :`,
          clone.status.reason,
        );
      }
    }

    for (const sync of syncResult.syncs) {
      // console.log(JSON.stringify({ sync }));

      if (sync.result.tag === "failed") {
        console.log(
          `ERROR: Sync ${sync.inputs?.repo.owner.login}/${sync.inputs?.repo.name} => ${sync.inputs?.repoTopLevel}/ :`,
          sync.result.reason,
        );
        continue;
      }

      const updateLocalResult = sync.result.value;
      const result = updateLocalResult.result;

      if (result.tag === "failed") {
        console.log(
          `ERROR: Sync ${sync.inputs.repo.owner.login}/${sync.inputs.repo.name} => ${sync.inputs.repoTopLevel}/ :`,
          JSON.stringify(result.reason),
        );
        continue;
      }

      const props = result.value;
      const pick = (output: [string, string, string], input: boolean | null) =>
        input === null ? output[1] : input ? output[0] : output[2];

      const flags = [
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

      console.log(
        [
          flags.join(" "),
          (props.defaultBranchState ?? "~").padEnd(14),
          `${sync.inputs.repo.owner.login}/${sync.inputs.repo.name}`,
        ].join("\t"),
      );

      // console.dir(updateLocalResult, { depth: 5 });
    }
  }

  // console.log(JSON.stringify(finalResult, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
