/**
 * Seed operational sub-module data into curated_intel.
 * Strips TypeScript from operational.ts, evaluates it, and seeds into DB.
 */
import mysql2 from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const conn = await mysql2.createConnection(process.env.DATABASE_URL);
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// Read and strip TypeScript from operational.ts
let src = fs.readFileSync("client/src/lib/operational.ts", "utf8");

// Remove TypeScript-specific syntax
src = src.replace(/export\s+interface\s+\w+\s*\{[^}]*\}/g, ""); // Remove interface blocks
src = src.replace(/export\s+function/g, "function");
src = src.replace(/export\s+\{[^}]*\}/g, "");
src = src.replace(/export\s+/g, "");
src = src.replace(/:\s*SubModuleOps\[\]/g, "");
src = src.replace(/:\s*SubModuleOps\s*\|?\s*undefined/g, "");
src = src.replace(/:\s*SubModuleOps\[\]/g, "");
src = src.replace(/:\s*string/g, "");
src = src.replace(/:\s*number/g, "");

// Write as a module that exports JSON
const tmpSrc = `
${src}

import fs from 'fs';
const data = allOps.map(op => ({
  key: op.key,
  inputs: op.inputs,
  outputs: op.outputs,
  dataSources: op.dataSources,
  workflow: op.workflow,
  frequency: op.frequency,
  handoffPoint: op.handoffPoint,
  criticalContext: op.criticalContext,
  xfnDependencies: op.xfnDependencies,
  learningLoop: op.learningLoop || null,
}));
fs.writeFileSync('/tmp/ops-data.json', JSON.stringify(data, null, 2));
console.log('Exported ' + data.length + ' records');
`;
fs.writeFileSync("/tmp/ops-export.mjs", tmpSrc);

// Run the export
import { execSync } from "child_process";
try {
  execSync("node /tmp/ops-export.mjs", { stdio: "inherit" });
} catch (e) {
  console.error("Export failed, trying manual parse...");
  // Fallback: manually parse the keys from the source
  const keyMatches = [...src.matchAll(/key:\s*"([^"]+)"/g)];
  const freqMatches = [...src.matchAll(/frequency:\s*"([^"]+)"/g)];
  const handoffMatches = [...src.matchAll(/handoffPoint:\s*"([^"]+)"/g)];
  
  const data = keyMatches.map((m, i) => ({
    key: m[1],
    frequency: freqMatches[i]?.[1] || "",
    handoffPoint: handoffMatches[i]?.[1] || "",
  }));
  fs.writeFileSync("/tmp/ops-data.json", JSON.stringify(data, null, 2));
  console.log(`Fallback: exported ${data.length} records (keys + frequency + handoff only)`);
}

// Read the exported JSON
const opsData = JSON.parse(fs.readFileSync("/tmp/ops-data.json", "utf8"));
console.log(`Loaded ${opsData.length} operational records`);

// Delete existing operational records
await conn.execute("DELETE FROM curated_intel WHERE category = 'operational_submodule'");

// Seed each record
let count = 0;
for (const op of opsData) {
  const [sectionKey, subModuleName] = (op.key || "").split("::");
  
  const metadata = JSON.stringify({
    inputs: op.inputs || [],
    outputs: op.outputs || [],
    dataSources: op.dataSources || [],
    workflow: op.workflow || [],
    xfnDependencies: op.xfnDependencies || [],
    learningLoop: op.learningLoop || null,
  });

  await conn.execute(
    `INSERT INTO curated_intel (id, category, subcategory, label, text1, text2, text3, text4, metadata, sort_order, is_active)
     VALUES (?, 'operational_submodule', ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      uid(),
      sectionKey || "",
      subModuleName || sectionKey || "",
      op.frequency || null,
      op.handoffPoint || null,
      (op.criticalContext || "").slice(0, 500) || null,
      op.learningLoop || null,
      metadata,
      count,
    ]
  );
  count++;
}

console.log(`Seeded ${count} operational_submodule records`);

const [r] = await conn.execute("SELECT COUNT(*) as total FROM curated_intel");
console.log(`Total records in curated_intel: ${r[0].total}`);

await conn.end();
console.log("Done!");
