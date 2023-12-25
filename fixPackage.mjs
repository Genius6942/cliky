import path from "path";
import fs from "fs";

const json = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "./package.json"), "utf8")
);

delete json.type;

fs.writeFileSync(
  path.resolve(process.cwd(), "./package.json"),
  JSON.stringify(json, null, 2),
  "utf8"
);
