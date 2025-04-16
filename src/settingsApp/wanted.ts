import * as fs from "fs";
import type { OwnerLogin } from "../index.js";
import type { SimplifiedRepositoriesSettings } from "./simplify.js";

const wantedFile = (owner: OwnerLogin) =>
  `var/repositories.${owner}.settings.wanted.json`;

export const loadWantedData = (
  owner: OwnerLogin,
): Promise<SimplifiedRepositoriesSettings> =>
  fs.promises
    .readFile(wantedFile(owner), "utf-8")
    .then((text) => JSON.parse(text));
