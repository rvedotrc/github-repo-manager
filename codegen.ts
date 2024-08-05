import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./vendor/github/schema.docs.graphql",
  documents: ["src/**/*.ts"],
  ignoreNoDocuments: true,
  generates: {
    "./generated/graphql/": {
      preset: "client",
      config: {
        documentMode: "string",
      },
    },
    // './schema.graphql': {
    //   plugins: ['schema-ast'],
    //   config: {
    //     includeDirectives: true
    //   }
    // }
  },
};

export default config;
