import { GitHubGraphClient } from "./gitHubGraphClient.js";
import {
  syncAllUnderOwnerToDir,
  type OwnerDir,
  type OwnerLogin,
} from "./index.js";
import { freshenReferenceData, type ReferenceData } from "./referenceData.js";
import { buildReport, aggregateReports, showReport } from "./report.js";
import { settingsApp } from "./settingsApp/index.js";

const main = async () => {
  const args = process.argv.slice(2);

  if (args[0] === "--settings") {
    return await settingsApp(args.slice(1));
  }

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

  const reports = finalResult.syncResults.map(buildReport);
  const aggregatedReport = aggregateReports(reports);
  showReport(aggregatedReport);

    const notAGitRepo = unmatchedLocals.filter((t) => !t.isGit);
    if (notAGitRepo.length > 0) {
      console.log();
      console.log(`Found the following, but they are not git repositories:`);
      console.log(
        "\t" +
          notAGitRepo
            .map((t) => t.childPath)
            .toSorted()
            .join("\n\t"),
      );
    }

    const pairedToNonExistentRemote = unmatchedLocals.filter(
      (t) => t.isGit && t.metadata.url,
    );
    if (pairedToNonExistentRemote.length > 0) {
      console.log();
      console.log(
        `Found the following, but the repositories they are apparently paired with don't exist. Maybe edit their .git/config?`,
      );
      console.log(
        "\t" +
          pairedToNonExistentRemote
            .map(
              (t) =>
                `${t.childPath} (supposed url: ${t.isGit && t.metadata.url})`,
            )
            .toSorted()
            .join("\n\t"),
      );
    }

    const notPaired = unmatchedLocals.filter((t) => t.isGit && !t.metadata.url);
    if (notPaired.length > 0) {
      console.log();
      console.log(
        `Found the following, but not paired to any repo. Maybe they're waiting for their first push?`,
      );
      console.log(
        "\t" +
          notPaired
            .map((t) => t.childPath)
            .toSorted()
            .join("\n\t"),
      );
    }
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
