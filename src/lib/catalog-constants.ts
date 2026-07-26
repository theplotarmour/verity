// Fabrics and materials are separate catalogs that share the ItemMaster table
// and are told apart by category name. Kept out of the server-action module
// because "use server" files may only export async functions.
export const FABRIC_CATEGORY = "Fabric";
export const DEFAULT_MATERIAL_CATEGORY = "General";
