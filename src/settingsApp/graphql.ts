import { graphql } from "../../generated/graphql/gql.js";

export const currentSettingsQuery = graphql(`
  query currentSettings($owner: String!, $first: Int!, $endCursor: String) {
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
          isArchived
          repositoryTopics(first: 20) {
            pageInfo {
              hasNextPage
            }
            nodes {
              id
              topic {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`);
