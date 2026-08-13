import type { ModuleDefinition } from "./registry";

/**
 * Creates a type-safe Module Definition to be registered in the system.
 */
export function createModule(defn: ModuleDefinition): ModuleDefinition {
  return defn;
}
