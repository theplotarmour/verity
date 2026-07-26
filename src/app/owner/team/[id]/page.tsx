import { getOwnerUser } from '@/lib/server/owner';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { MemberDetailClient } from './client';
import { canUser } from "@/lib/server/permissions";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect('/');
  if (!(await canUser(dbUser, 'MANAGE_TEAM'))) redirect('/unauthorized');

  const member = await prisma.user.findUnique({
    where: { id, factoryId: dbUser.factoryId }
  });

  if (!member) notFound();

  const orderCount = await prisma.jobCard.count({
    where: { factoryId: dbUser.factoryId, assignedToId: member.id }
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { actorUserId: member.id },
        { action: { contains: member.name } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return (
    <MemberDetailClient 
      member={member} 
      currentUser={dbUser}
      orderCount={orderCount}
      auditLogs={auditLogs}
    />
  );
}
