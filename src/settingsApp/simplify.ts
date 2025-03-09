import type { ReferenceData, Repository } from "./current.js";

export type SimplifiedRepositoriesSettings = ReturnType<typeof simplify>;
export type SimplifiedRepositorySettings =
  SimplifiedRepositoriesSettings["repositories"][number];

const simplifyTopics = (
  repositoryTopics: Repository["repositoryTopics"],
  which: string,
) => {
  if (repositoryTopics.pageInfo.hasNextPage)
    throw new Error(`Too many topics on ${which}`);

  return (repositoryTopics.nodes ?? [])
    .filter((node) => node !== null)
    .map((node) => node.topic.name)
    .toSorted();
};

export const simplify = (data: ReferenceData) => {
  return {
    ...data,
    repositories: data.repositories
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        visibility: repo.visibility,
        archive: repo.isArchived,
        topicNames: simplifyTopics(
          repo.repositoryTopics,
          `${repo.owner.login}/${repo.name}`,
        ),
      }))
      .toSorted((a, b) =>
        a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()),
      ),
  };
};
