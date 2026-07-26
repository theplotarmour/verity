import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import { getDepartmentsData } from "@/server/actions/departments";
import { DepartmentsClient } from "./DepartmentsClient";

export default async function DepartmentsPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");

  const { departments, users, templates } = await getDepartmentsData();

  return <DepartmentsClient departments={departments} users={users} templates={templates} />;
}
