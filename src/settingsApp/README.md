# Repo settings sync

To manage repo archival / visibility / topics as code.

## Preparation

```shell
asdf install
# (or otherwise install the things listed in .tool-versions, if you don't use asdf)

npm install yarn
yarn build
```

## Usage

Make sure the `GH_API_TOKEN` environment variable is set.

```shell
mkdir -p var
node dist/src/main.js --settings --pull my-org-or-user-name
```

This reads the existing repository settings into `var/repositories.ORG_OR_USER.settings.current.json`

Copy that file to `wanted`:

```shell
cp var/repositories.ORG_OR_USER.settings.current.json \
   var/repositories.ORG_OR_USER.settings.wanted.json
```

Now keep that `wanted` file under version control.

To apply the settings in `wanted` to GitHub, run:

```shell
node dist/src/main.js --settings --push my-org-or-user-name
```

and then review and run the `gh` commands that it shows.

To check that the settings in GitHub are in sync with `wanted`, but without applying changes:

```shell
node dist/src/main.js --settings --check my-org-or-user-name
# exit status is 0 for in sync, 1 for not in sync
```
