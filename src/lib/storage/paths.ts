export function createStoragePath({
  factoryId,
  scope,
  id,
  fileName,
}: {
  factoryId: string;
  scope: "evidence" | "orders" | "logos" | "documents" | "catalogue" | "passports";
  id: string;
  fileName?: string;
}) {
  const safeName = (fileName || "image.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `factory/${factoryId}/${scope}/${id}/${Date.now()}-${safeName}`;
}
