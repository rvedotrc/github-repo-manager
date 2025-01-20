import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { runAndCapture } from "./runAndCapture.js";

const splitBuffer = (
  buffer: Buffer,
  marker: number,
  requireEnd = true,
): Buffer[] => {
  const out: Buffer[] = [];

  let i = 0;
  while (i < buffer.length) {
    const z = buffer.indexOf(marker, i);

    if (z < 0) {
      if (requireEnd) throw new Error("No marker");

      out.push(buffer.subarray(i));
      break;
    }

    out.push(buffer.subarray(i, z));
    i = z + 1;
  }

  return out;
};

const joinBuffer = (
  items: Buffer[],
  marker: number,
  addTrailing: boolean,
): Buffer => {
  const withTrailing = items.reduce(
    (acc, item) => Buffer.of(...acc, ...item, marker),
    Buffer.of(),
  );

  if (!addTrailing) return withTrailing.subarray(0, withTrailing.length - 1);
  return withTrailing;
};

const normalize = (b: Buffer) =>
  Buffer.from(b.toString("utf-8").normalize(), "utf-8");

const bufferEquals = (a: Buffer, b: Buffer): boolean =>
  a.toString("hex") === b.toString("hex");

const mktree = async (
  listing: Buffer,
  nullTerminated: boolean,
): Promise<string> => {
  const child = spawn("git", ["mktree", ...(nullTerminated ? ["-z"] : [])], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  const sendInput = new Promise<void>((resolve, reject) =>
    child.stdin.write(listing, (err: unknown) =>
      err ? reject(err) : resolve(),
    ),
  ).then(
    () =>
      new Promise<void>((resolve, reject) =>
        child.stdin.end((err: unknown) => (err ? reject(err) : resolve())),
      ),
  );

  const getOutput = new Promise<string>((resolve, reject) => {
    let out = Buffer.of();
    child.stdout.on("data", (chunk) => (out = Buffer.concat([out, chunk])));
    child.stdout.on("close", () => resolve(out.toString("ascii").trimEnd()));
    child.stdout.on("error", (err) => reject(err));
  });

  await sendInput;
  return await getOutput;
};

const reEncodeTree = async (oldTreeId: string): Promise<string> => {
  const oldListing = await promisify(execFile)(
    "git",
    ["ls-tree", oldTreeId], // FIXME: "-z"
    { encoding: "buffer" },
  ).then((r) => r.stdout);

  const newEntries = await Promise.all(
    splitBuffer(oldListing, 10, true).map(async (oldEntry): Promise<Buffer> => {
      const bits = splitBuffer(oldEntry, 9, false);

      const [mode, type, oldObjectId] = bits[0].toString("ascii").split(" ");

      const newObjectId =
        type === "tree" ? await reEncodeTree(oldObjectId) : oldObjectId;
      const newNameAsBuffer = normalize(bits[1]);

      const newEntry = joinBuffer(
        [
          Buffer.from(`${mode} ${type} ${newObjectId}`, "ascii"),
          newNameAsBuffer,
          ...bits.slice(2),
        ],
        9,
        false,
      );

      if (!bufferEquals(oldEntry, newEntry)) {
        console.log(
          `Changed ${bits[1]} in ${oldTreeId} from ${oldEntry} to ${newEntry}`,
        );
        console.log(oldEntry.toString("hex"));
        console.log(newEntry.toString("hex"));
      }

      return newEntry;
    }),
  );

  const newListing = joinBuffer(newEntries, 10, true);

  if (bufferEquals(oldListing, newListing)) {
    return oldTreeId;
  }

  console.log("Need to rewrite " + oldTreeId);
  console.log(newListing.toString("binary"));

  const newTreeId = await mktree(newListing, false);

  console.log(`Rewrote ${oldTreeId} -> ${newTreeId}`);

  return newTreeId;
};

const main = async () => {
  //   const out = execFileSync("git", ["ls-tree", "-r", "HEAD:"]);
  //   const s = out.toString("utf-8");
  //   const n = s.normalize();
  //   const b = Buffer.from(n, "utf-8");
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   console.log(out.compare(b as any));
  //   const s0 = splitBuffer(out, 10);
  //   const s1 = splitBuffer(b, 10);
  //   //   console.log([s0.length, s1.length]);
  //   //   console.log({ s0, s1 });
  //   for (const [i, v0] of s0.entries()) {
  //     const v1 = s1[i];
  //     const l0 = splitBuffer(v0, 9, false);
  //     const l1 = splitBuffer(v1, 9, false);
  //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //     if (v0.compare(v1 as any) !== 0) {
  //       console.log({ n0: l0[1], n1: l1[1] });
  //       const r = spawnSync("git", [
  //         "mv",
  //         "-v",
  //         "-f",
  //         l0[1].toString("binary"),
  //         l1[1].toString("binary"),
  //       ]);
  //       console.log([r.status, r.signal, r.stderr.toString("binary")]);
  //     }
  //   }

  const oldTree = await runAndCapture("git", ["rev-parse", "HEAD:"]).then((r) =>
    r.stdout.trimEnd(),
  );

  await reEncodeTree(oldTree);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
