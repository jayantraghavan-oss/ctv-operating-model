/**
 * useOperationalData — Loads operational sub-module metadata from the database.
 * Falls back to the static data in operational.ts if DB is unavailable.
 */
import { useMemo } from "react";
import { useCuratedData, type CuratedRow } from "./useCuratedData";
import {
  getSubModuleOps as staticGetSubModuleOps,
  getSectionOps as staticGetSectionOps,
  allOps as staticAllOps,
  type SubModuleOps,
  type WorkflowStep,
} from "@/lib/operational";

function dbRowToOps(row: CuratedRow): SubModuleOps {
  const meta = row.metadata || {};
  return {
    key: `${row.subcategory}::${row.label}`,
    inputs: meta.inputs || [],
    outputs: meta.outputs || [],
    dataSources: meta.dataSources || [],
    workflow: (meta.workflow || []) as WorkflowStep[],
    frequency: row.text1 || "",
    handoffPoint: row.text2 || "",
    criticalContext: row.text3 || "",
    xfnDependencies: meta.xfnDependencies || [],
    learningLoop: row.text4 || meta.learningLoop || undefined,
  };
}

export function useOperationalData() {
  const { data: curatedData, loading } = useCuratedData(["operational_submodule"]);

  const dbOps = useMemo(() => {
    const rows = curatedData.operational_submodule;
    if (!rows?.length) return null;
    return rows.map(dbRowToOps);
  }, [curatedData]);

  const allOps = dbOps || staticAllOps;

  const getSubModuleOps = (sectionKey: string, subModuleName: string): SubModuleOps | undefined => {
    if (dbOps) {
      const exactKey = `${sectionKey}::${subModuleName}`;
      const exact = dbOps.find((o) => o.key === exactKey);
      if (exact) return exact;
      return dbOps.find((o) => o.key.endsWith(`::${subModuleName}`));
    }
    return staticGetSubModuleOps(sectionKey, subModuleName);
  };

  const getSectionOps = (sectionKey: string): SubModuleOps[] => {
    if (dbOps) {
      return dbOps.filter((o) => o.key.startsWith(`${sectionKey}::`));
    }
    return staticGetSectionOps(sectionKey);
  };

  return {
    allOps,
    getSubModuleOps,
    getSectionOps,
    loading,
    isDbBacked: !!dbOps,
  };
}
