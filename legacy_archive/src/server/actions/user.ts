'use server'

import prisma from '@/lib/prisma'
import { getUserSession, createUserSession } from '@/lib/server/auth'
import { revalidatePath } from 'next/cache'

const supportedLanguages = new Set(['en', 'hi'])

export async function updateUserLanguage(language: 'en' | 'hi') {
  const session = await getUserSession()
  if (!session) return { error: 'Unauthorized' }
  if (!supportedLanguages.has(language)) return { error: 'Unsupported language' }

  await prisma.user.update({
    where: { id: session.userId },
    data: { language }
  })

  // Refresh session with updated language
  await createUserSession({
    userId: session.userId,
    factoryId: session.factoryId,
    role: session.role,
    language,
  });

  revalidatePath('/', 'layout')

  return { success: true }
}

export async function getNotificationSettings() {
  const session = await getUserSession()
  if (!session) return { email: false, whatsapp: false, contactEmail: '' }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, notificationPrefs: true },
  })
  const prefs = (user?.notificationPrefs as { email?: boolean; whatsapp?: boolean } | null) ?? {}
  return { email: !!prefs.email, whatsapp: !!prefs.whatsapp, contactEmail: user?.email ?? '' }
}

export async function updateNotificationSettings(data: { email: boolean; whatsapp: boolean; contactEmail?: string }) {
  const session = await getUserSession()
  if (!session) return { error: 'Unauthorized' }
  if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
    return { error: 'Enter a valid email address' }
  }
  await prisma.user.update({
    where: { id: session.userId },
    data: {
      notificationPrefs: { email: data.email, whatsapp: data.whatsapp },
      ...(data.contactEmail !== undefined ? { email: data.contactEmail || null } : {}),
    },
  })
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getUserLanguage() {
  const session = await getUserSession()
  if (!session) return 'en'
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { language: true }
    })
    return user?.language || session.language || 'en'
  } catch {
    return session.language || 'en'
  }
}
