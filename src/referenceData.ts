import { graphql } from "../generated/graphql";
import { GitHubGraphClient } from "./gitHubGraphClient";
import { ListRepositoriesQuery } from "../generated/graphql/graphql";
import * as fs from "fs";

const listRepositoriesQuery = graphql(`
  query listRepositories($owner: String!, $first: Int!, $endCursor: String) {
    repositoryOwner(login: $owner) {
      repositories(first: $first, after: $endCursor) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          id
          name
          owner {
            login
          }
          visibility
          defaultBranchRef {
            name
          }
          url

          isArchived
          isEmpty
          isFork
          isLocked
          isMirror
          isPrivate
          isTemplate

          createdAt
          updatedAt
          pushedAt
          archivedAt
        }
      }
    }
  }
`);

export type RepositoriesCollection = NonNullable<
  NonNullable<ListRepositoriesQuery["repositoryOwner"]>["repositories"]
>;

export type Repository = NonNullable<
  NonNullable<RepositoriesCollection["nodes"]>[number]
>;

export type ReferenceData = { repositories: Array<Repository> };

const fetchReferenceData = async (
  owner: string,
  client: GitHubGraphClient,
  chunkSize = 20,
): Promise<Repository[]> => {
  const repositories: Repository[] = [];
  let endCursor = "";

  while (true) {
    console.debug(`list ${owner} ${chunkSize} ${endCursor}`);
    const response = await client.execute(listRepositoriesQuery, {
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

const referenceFile = (owner: string) => `var/repositories.${owner}.json`;

export const freshenReferenceData = async (
  owner: string,
  client: GitHubGraphClient,
): Promise<ReferenceData> => {
  const referenceData = {
    repositories: await fetchReferenceData(owner, client, 20),
  };

  const finalFile = referenceFile(owner);
  const tmpFile = finalFile + ".tmp";

  const content = JSON.stringify(referenceData) + "\n";
  await fs.promises.writeFile(tmpFile, content, { encoding: "utf-8" });
  await fs.promises.rename(tmpFile, finalFile);
  console.debug(`Saved to ${finalFile}`);

  return referenceData;
};

export const loadReferenceData = (owner: string): Promise<ReferenceData> =>
  fs.promises
    .readFile(referenceFile(owner), "utf-8")
    .then((text) => JSON.parse(text));
