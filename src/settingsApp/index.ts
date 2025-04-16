import { GitHubGraphClient } from "../gitHubGraphClient.js";

import { OwnerLogin } from "../index.js";
import { freshenReferenceData } from "./current.js";
import { loadWantedData } from "./wanted.js";
import { writeRepo } from "./writeRepo.js";

const write = async (args: {
  owner: OwnerLogin;
  client: GitHubGraphClient;
}): Promise<string[]> => {
  const [currentData, wantedData] = await Promise.all([
    freshenReferenceData(args.owner, args.client),
    loadWantedData(args.owner),
  ]);

  const repoNames = new Set(
    [...currentData.repositories, ...wantedData.repositories].map(
      (r) => r.name,
    ),
  );

  return (
    await Promise.all(
      [...repoNames].map((name) =>
        writeRepo({
          owner: args.owner,
          client: args.client,
          name,
          current: currentData.repositories.find((r) => r.name === name),
          wanted: wantedData.repositories.find((r) => r.name === name),
        }),
      ),
    )
  ).flat();
};

export const settingsApp = async (args: string[]) => {
  const client = new GitHubGraphClient(process.env.GH_API_TOKEN ?? "");

  if (args[0] === "--pull") {
    await Promise.all(
      args
        .slice(1)
        .map((owner) => freshenReferenceData(owner as OwnerLogin, client)),
    );

    // console.log(JSON.stringify(r.map(simplify), null, 2));
  } else if (args[0] === "--push" || args[0] === "--check") {
    const shellCommands = (
      await Promise.all(
        args
          .slice(1)
          .map((owner) => write({ owner: owner as OwnerLogin, client })),
      )
    ).flat();

    const isCheck = args[0] === "--check";

    if (shellCommands.length === 0) {
      console.log("All in sync, nothing to change");
    } else if (isCheck) {
      console.error("");
      console.error(
        "GitHub is not in sync, due to the following unapplied changes:",
      );
      console.error("");
      console.error(shellCommands.join("\n"));
      console.error("");
      console.error(
        'Re-run with "--push" instead of "--check" to apply these changes',
      );
      process.exit(1);
    } else {
      console.log("");
      console.log(
        "Run the following commands to apply your 'wanted' settings:",
      );
      console.log("");
      console.log(shellCommands.join("\n"));
      console.log("");
    }
  } else {
    console.error(
      "Usage: ./run --settings ( --pull | --push | --check ) OWNER ...",
    );
    process.exit(1);
  }
};
