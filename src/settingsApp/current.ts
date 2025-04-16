import type { GitHubGraphClient } from "../gitHubGraphClient.js";
import type { OwnerLogin } from "../index.js";
import * as fs from "fs";

import { currentSettingsQuery } from "./graphql.js";
import type { CurrentSettingsQuery } from "../../generated/graphql/graphql.js";
import { simplify, type SimplifiedRepositoriesSettings } from "./simplify.js";

export type RepositoriesCollection = Readonly<
  NonNullable<
    NonNullable<CurrentSettingsQuery["repositoryOwner"]>["repositories"]
  >
>;

export type Repository = Readonly<
  NonNullable<NonNullable<RepositoriesCollection["nodes"]>[number]>
>;
export type ReferenceData = {
  readonly owner: string;
  readonly repositories: ReadonlyArray<Repository>;
};

const fetchReferenceData = async (
  owner: OwnerLogin,
  client: GitHubGraphClient,
  chunkSize = 20,
): Promise<ReadonlyArray<Repository>> => {
  const repositories: Repository[] = [];
  let endCursor = "";

  while (true) {
    console.debug(`list ${owner} ${chunkSize} ${endCursor}`);
    const response = await client.execute(currentSettingsQuery, {
      owner,
      endCursor,
      first: chunkSize,
    });

    const collection: RepositoriesCollection | undefined =
      response.data?.repositoryOwner?.repositories;

    if (!collection) {
      console.error(response);
      throw new Error("No collection");
    }

    if (collection.nodes) {
      const items = collection.nodes.flatMap((i) => (i ? [i] : []));
      repositories.push(...items);
    }
    endCursor = collection.pageInfo?.endCursor ?? "";

    if (!collection.pageInfo?.hasNextPage) break;
  }

  return repositories;
};

const referenceFile = (owner: OwnerLogin) =>
  `var/repositories.${owner}.settings.current.json`;

export const freshenReferenceData = async (
  owner: OwnerLogin,
  client: GitHubGraphClient,
): Promise<SimplifiedRepositoriesSettings> => {
  const referenceData = simplify({
    owner,
    repositories: await fetchReferenceData(owner, client, 20),
  });

  const finalFile = referenceFile(owner);
  const tmpFile = finalFile + ".tmp";

  const content = JSON.stringify(referenceData, null, 2) + "\n";
  await fs.promises.writeFile(tmpFile, content, { encoding: "utf-8" });
  await fs.promises.rename(tmpFile, finalFile);
  console.debug(`Saved to ${finalFile}`);

  return referenceData;
};

export const loadReferenceData = (
  owner: OwnerLogin,
): Promise<SimplifiedRepositoriesSettings> =>
  fs.promises
    .readFile(referenceFile(owner), "utf-8")
    .then((text) => JSON.parse(text));
