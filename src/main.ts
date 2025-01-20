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
          result.reason,
        );
        continue;
      }

      console.log(
        `${sync.inputs.repo.owner.login}/${sync.inputs.repo.name}\t${result.value.code}`,
      );
    }
  }

  // console.log(JSON.stringify(finalResult, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
