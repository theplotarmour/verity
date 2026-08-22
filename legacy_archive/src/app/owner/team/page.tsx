import { getOwnerUser } from '@/lib/server/owner';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { TeamClient } from './client';
import { canUser } from "@/lib/server/permissions";

export default async function TeamPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect('/');
  if (!(await canUser(dbUser, 'MANAGE_TEAM'))) redirect('/unauthorized');

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      where: { factoryId: dbUser.factoryId },
      include: { department: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.department.findMany({
      where: { factoryId: dbUser.factoryId, active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  /*
   * Each member used to show the job card they were working and a lifetime
   * count of cards assigned. Job cards went with the manufacturing module, and
   * nothing else in the platform assigns a unit of work to a person, so the
   * columns are empty rather than filled with a different number that happens
   * to be available.
   */
  const members = users.map((user) => ({
    ...user,
    workerOrders: [],
    inspectorOrders: [],
    _count: { workerOrders: 0, inspectorOrders: 0 },
  }));

  return (
    <TeamClient
      initialMembers={JSON.parse(JSON.stringify(members))}
      currentUserId={dbUser.id}
      departments={departments}
    />
  );
}
