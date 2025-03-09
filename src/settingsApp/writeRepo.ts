import type { RepositoryVisibility } from "../../generated/graphql/graphql.js";
import type { GitHubGraphClient } from "../gitHubGraphClient.js";
import type { OwnerLogin } from "../index.js";
import type { SimplifiedRepositorySettings } from "./simplify.js";

export const writeRepo = async (args: {
  owner: OwnerLogin;
  client: GitHubGraphClient;
  name: string;
  current: SimplifiedRepositorySettings | undefined;
  wanted: SimplifiedRepositorySettings | undefined;
}) => {
  const { owner, current, wanted, name, client } = args;

  if (wanted === undefined) {
    console.warn(`No 'wanted' settings for ${owner}/${name}`);
    return;
  }

  if (current === undefined) {
    console.warn(`No such repository ${owner}/${name}`);
    return;
  }

  return Promise.all([
    writeTopics({
      owner,
      name,
      current: current.topicNames,
      wanted: wanted.topicNames,
      client,
    }),
    writeArchived({
      owner,
      name,
      current: current.archive,
      wanted: wanted.archive,
      client,
    }),
    writeVisibility({
      owner,
      name,
      current: current.visibility,
      wanted: wanted.visibility,
      client,
    }),
  ]);
};

function writeTopics(args: {
  owner: OwnerLogin;
  name: string;
  current: string[];
  wanted: string[];
  client: GitHubGraphClient;
}) {
  const toAdd = args.wanted.filter((s) => !args.current.includes(s));
  const toRemove = args.current.filter((s) => !args.wanted.includes(s));

  return Promise.all([
    ...toAdd.map(async (topicName) => {
      console.log(
        `gh repo edit ${args.owner}/${args.name} --add-topic '${topicName}'`,
      );
    }),
    ...toRemove.map(async (topicName) => {
      console.log(
        `gh repo edit ${args.owner}/${args.name} --remove-topic '${topicName}'`,
      );
    }),
  ]);
}

function writeArchived(args: {
  owner: OwnerLogin;
  name: string;
  current: boolean;
  wanted: boolean;
  client: GitHubGraphClient;
}) {
  if (args.wanted != args.current) {
    // There is a "--yes" option, which we're not using
    console.log(
      `gh repo ${args.wanted ? "archive" : "unarchive"} ${args.owner}/${args.name}`,
    );
  }
}

function writeVisibility(args: {
  owner: OwnerLogin;
  name: string;
  current: RepositoryVisibility;
  wanted: RepositoryVisibility;
  client: GitHubGraphClient;
}) {
  if (args.wanted != args.current) {
    // There is a '--accept-visibility-change-consequences' option, which we're not using
    console.log(
      `gh repo edit ${args.owner}/${args.name} --visibility ${args.wanted}`,
    );
  }
}
