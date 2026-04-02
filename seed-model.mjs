/**
 * Seed core model data (modules, clusters, prompts) into curated_intel.
 * Strips TypeScript from data.ts, evaluates it, and seeds into DB.
 */
import mysql2 from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import { execSync } from "child_process";
dotenv.config();

const conn = await mysql2.createConnection(process.env.DATABASE_URL);
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// Read data.ts and strip TypeScript
let src = fs.readFileSync("client/src/lib/data.ts", "utf8");

// Remove TypeScript-specific syntax
src = src.replace(/export\s+type\s+\w+\s*=\s*[^;]+;/g, "");
src = src.replace(/export\s+interface\s+\w+\s*\{[\s\S]*?\n\}/g, "");
src = src.replace(/export\s+/g, "");
src = src.replace(/:\s*OwnerType/g, "");
src = src.replace(/:\s*AgentType/g, "");
src = src.replace(/:\s*PromptStatus/g, "");
src = src.replace(/:\s*Cluster\[\]/g, "");
src = src.replace(/:\s*Prompt\[\]/g, "");
src = src.replace(/:\s*Module\[\]/g, "");
src = src.replace(/:\s*string/g, "");
src = src.replace(/:\s*number/g, "");
src = src.replace(/:\s*boolean/g, "");
// Remove type annotations in function params
src = src.replace(/\(p\s*:\s*\w+\)/g, "(p)");
src = src.replace(/\(m\s*:\s*\w+\)/g, "(m)");

// Write as a module that exports JSON
const tmpSrc = `
${src}
import fs from 'fs';
const data = { modules, clusters, prompts };
fs.writeFileSync('/tmp/model-data.json', JSON.stringify(data, null, 2));
console.log('Exported ' + modules.length + ' modules, ' + clusters.length + ' clusters, ' + prompts.length + ' prompts');
`;
fs.writeFileSync("/tmp/model-export.mjs", tmpSrc);

try {
  execSync("node /tmp/model-export.mjs", { stdio: "inherit" });
} catch (e) {
  console.error("Export failed:", e.message);
  process.exit(1);
}

const { modules, clusters, prompts } = JSON.parse(fs.readFileSync("/tmp/model-data.json", "utf8"));
console.log(`Loaded ${modules.length} modules, ${clusters.length} clusters, ${prompts.length} prompts`);

// Delete existing model records
await conn.execute("DELETE FROM curated_intel WHERE category IN ('model_module', 'model_cluster', 'model_prompt')");

// Seed modules
let count = 0;
for (const mod of modules) {
  const metadata = JSON.stringify({
    sections: mod.sections,
    clusterId: mod.clusterId,
    clusterIds: mod.clusterIds,
  });
  await conn.execute(
    `INSERT INTO curated_intel (id, category, subcategory, label, value1, text1, text2, metadata, sort_order, is_active)
     VALUES (?, 'model_module', ?, ?, ?, ?, ?, ?, ?, 1)`,
    [uid(), String(mod.id), mod.name, mod.id, mod.shortName, mod.description || "", metadata, count]
  );
  count++;
}
console.log(`Seeded ${modules.length} modules`);

// Seed clusters
for (const cl of clusters) {
  const metadata = JSON.stringify({
    twoModes: cl.twoModes,
    modules: cl.modules,
    orchestratorPrompts: cl.orchestratorPrompts,
  });
  await conn.execute(
    `INSERT INTO curated_intel (id, category, subcategory, label, value1, text1, text2, metadata, sort_order, is_active)
     VALUES (?, 'model_cluster', ?, ?, ?, ?, ?, ?, ?, 1)`,
    [uid(), String(cl.id), cl.name, cl.id, cl.shortName, cl.primaryModuleCoverage || "", metadata, count]
  );
  count++;
}
console.log(`Seeded ${clusters.length} clusters`);

// Seed prompts
for (const p of prompts) {
  const metadata = JSON.stringify({
    agentType: p.agentType,
    owner: p.owner,
    status: p.status,
    moduleId: p.moduleId,
    clusterId: p.clusterId,
    sectionKey: p.sectionKey,
    subModule: p.subModule,
    systemPrompt: p.systemPrompt,
  });
  await conn.execute(
    `INSERT INTO curated_intel (id, category, subcategory, label, value1, text1, text2, text3, metadata, sort_order, is_active)
     VALUES (?, 'model_prompt', ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [uid(), p.sectionKey || "", p.name || "", p.id, p.agentType || "", p.owner || "", p.subModule || "", metadata, count]
  );
  count++;
}
console.log(`Seeded ${prompts.length} prompts`);

const [r] = await conn.execute("SELECT COUNT(*) as total FROM curated_intel");
console.log(`Total records in curated_intel: ${r[0].total}`);

await conn.end();
console.log("Done!");
