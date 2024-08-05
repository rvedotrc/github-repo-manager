import type { TypedDocumentString } from "../generated/graphql/graphql";

export type QueryResult<T> = {
  data?: T;
  errors?: Array<unknown>;
};

export class GitHubGraphClient {
  constructor(private readonly token: string) {}

  public async execute<TResult, TVariables>(
    query: TypedDocumentString<TResult, TVariables>,
    variables?: TVariables,
  ): Promise<QueryResult<TResult>> {
    // TODO: rate limiting and retrying

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/graphql-response+json; application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      console.error(response);
      throw new Error("Network response was not ok");
    }

    return response.json();
  }
}
