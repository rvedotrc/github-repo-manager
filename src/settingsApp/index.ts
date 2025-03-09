import { GitHubGraphClient } from "../gitHubGraphClient.js";

import { OwnerLogin } from "../index.js";
import { freshenReferenceData } from "./current.js";
import { loadWantedData } from "./wanted.js";
import { writeRepo } from "./writeRepo.js";

const write = async (args: {
  owner: OwnerLogin;
  client: GitHubGraphClient;
}) => {
  const [currentData, wantedData] = await Promise.all([
    freshenReferenceData(args.owner, args.client),
    loadWantedData(args.owner),
  ]);

  const repoNames = new Set(
    [...currentData.repositories, ...wantedData.repositories].map(
      (r) => r.name,
    ),
  );

  return await Promise.all(
    [...repoNames].map((name) =>
      writeRepo({
        owner: args.owner,
        client: args.client,
        name,
        current: currentData.repositories.find((r) => r.name === name),
        wanted: wantedData.repositories.find((r) => r.name === name),
      }),
    ),
  );
};

export const settingsApp = async (args: string[]) => {
  const client = new GitHubGraphClient(process.env.GH_API_TOKEN ?? "");

  if (args[0] === "--read") {
    await Promise.all(
      args
        .slice(1)
        .map((owner) => freshenReferenceData(owner as OwnerLogin, client)),
    );

    // console.log(JSON.stringify(r.map(simplify), null, 2));
  } else if (args[0] === "--write") {
    await Promise.all(
      args
        .slice(1)
        .map((owner) => write({ owner: owner as OwnerLogin, client })),
    );
    // console.log(JSON.stringify(r, null, 2));
  } else {
    console.error(
      "Usage: ./run --settings ( --read | --write | --test ) OWNER ...",
    );
    process.exit(1);
  }
};
