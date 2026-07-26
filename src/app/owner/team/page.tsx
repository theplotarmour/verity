import { getOwnerUser } from '@/lib/server/owner';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { TeamClient } from './client';
import { canUser } from "@/lib/server/permissions";
import { jobCardInclude, toWorkerJob } from '@/lib/server/jobCardAdapter';

export default async function TeamPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect('/');
  if (!(await canUser(dbUser, 'MANAGE_TEAM'))) redirect('/unauthorized');

  const [users, activeJobCards, jobCardCounts, departments] = await Promise.all([
    prisma.user.findMany({
      where: { factoryId: dbUser.factoryId },
      orderBy: { name: 'asc' },
    }),
    prisma.jobCard.findMany({
      where: {
        factoryId: dbUser.factoryId,
        assignedToId: { not: null },
        status: { in: ['WAITING', 'IN_PROGRESS', 'QC_PENDING', 'REWORK_REQUIRED'] },
      },
      include: jobCardInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.jobCard.groupBy({
      by: ['assignedToId'],
      where: { factoryId: dbUser.factoryId, assignedToId: { not: null } },
      _count: { id: true },
    }),
    prisma.department.findMany({
      where: { factoryId: dbUser.factoryId, active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const countMap = new Map(jobCardCounts.map((c) => [c.assignedToId, c._count.id]));
  const activeByUser = new Map<string, any>();
  for (const jobCard of activeJobCards) {
    if (jobCard.assignedToId && !activeByUser.has(jobCard.assignedToId)) {
      activeByUser.set(jobCard.assignedToId, toWorkerJob(jobCard));
    }
  }

  // TeamClient consumes the old workerOrders/inspectorOrders shape; feed it
  // the active job card mapped through the legacy adapter.
  const members = users.map((user) => {
    const active = activeByUser.get(user.id);
    const activeOrders = active
      ? [{ id: active.id, vehicleBrand: active.order.vehicleBrand ?? { name: '' }, vehicleModel: active.order.vehicleModel ?? { name: '' } }]
      : [];
    return {
      ...user,
      workerOrders: user.role === 'WORKER' ? activeOrders : [],
      inspectorOrders: user.role === 'SUPERVISOR' ? activeOrders : [],
      _count: {
        workerOrders: user.role === 'WORKER' ? (countMap.get(user.id) ?? 0) : 0,
        inspectorOrders: user.role === 'SUPERVISOR' ? (countMap.get(user.id) ?? 0) : 0,
      },
    };
  });

  return (
    <TeamClient
      initialMembers={JSON.parse(JSON.stringify(members))}
      currentUserId={dbUser.id}
      departments={departments}
    />
  );
}
