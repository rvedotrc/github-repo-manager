import { GitHubGraphClient } from "./gitHubGraphClient.js";
import {
  syncAllUnderOwnerToDir,
  type OwnerDir,
  type OwnerLogin,
} from "./index.js";
import { freshenReferenceData, type ReferenceData } from "./referenceData.js";
import { buildReport, aggregateReports, showReport } from "./report.js";

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

  const reports = finalResult.syncResults.map(buildReport);
  const aggregatedReport = aggregateReports(reports);
  showReport(aggregatedReport);

  // console.log(JSON.stringify(finalResult, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
