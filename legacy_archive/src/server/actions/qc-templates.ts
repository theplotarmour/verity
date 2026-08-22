'use server'

import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";

import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/server/auth'
import { revalidatePath } from 'next/cache'

export async function getQCTemplates() {
  const session = await getUserSession()
  if (!session) throw new Error('Unauthorized')
  await guardModuleAction("quality");

  return await prisma.checklistTemplate.findMany({
    where: { factoryId: session.factoryId, status: 'active' },
    include: {
      ownerDepartment: { select: { id: true, name: true, isQcStage: true } },
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          checkpoints: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function saveQCTemplate(data: {
  id?: string
  name: string
  requiresVideo?: boolean
  /** The single department this checklist belongs to. */
  ownerDepartmentId?: string | null
  sections: Array<{
    id?: string
    title: string
    titleHi?: string
    titleHinglish?: string
    sortOrder: number
    checkpoints: Array<{
      id?: string
      name: string
      nameHi?: string
      nameHinglish?: string
      instructions: string
      instructionsHi?: string
      instructionsHinglish?: string
      requireImage: boolean
      requireRemarks: boolean
      isRequired?: boolean
      referenceImageUrl?: string | null
      inputType?: string
      placeholder?: string | null
      sortOrder: number
    }>
  }>
}) {
  const session = await getUserSession()
  if (!session) return { error: 'Unauthorized' }
  const factoryId = session.factoryId

  try {
    let templateId = data.id

    if (templateId) {
      await prisma.checklistTemplate.update({
        where: { id: templateId },
        data: {
          name: data.name,
          ...(data.requiresVideo !== undefined ? { requiresVideo: data.requiresVideo } : {}),
          ...(data.ownerDepartmentId !== undefined ? { ownerDepartmentId: data.ownerDepartmentId || null } : {}),
        }
      })
    } else {
      const newTpl = await prisma.checklistTemplate.create({
        data: {
          factoryId,
          name: data.name,
          status: 'active',
          requiresVideo: data.requiresVideo ?? false,
          ownerDepartmentId: data.ownerDepartmentId || null,
        }
      })
      templateId = newTpl.id
    }

    // Load existing sections to find out what to delete/update
    const existingSections = await prisma.templateSection.findMany({
      where: { templateId },
      include: { checkpoints: true }
    })

    const incomingSectionIds = data.sections.map(s => s.id).filter(Boolean) as string[]
    const sectionsToDelete = existingSections.filter(s => !incomingSectionIds.includes(s.id))

    // Delete removed sections (Cascade deletes checkpoints)
    for (const sec of sectionsToDelete) {
      await prisma.templateSection.delete({ where: { id: sec.id } }).catch(() => {
        // Fallback: if foreign key prevents deletion, keep it
      })
    }

    // Process incoming sections
    for (const secData of data.sections) {
      let secId = secData.id

      if (secId) {
        await prisma.templateSection.update({
          where: { id: secId },
          data: {
            title: secData.title,
            titleHi: secData.titleHi || null,
            titleHinglish: secData.titleHinglish || null,
            sortOrder: secData.sortOrder
          }
        })
      } else {
        const newSec = await prisma.templateSection.create({
          data: {
            factoryId,
            templateId: templateId!,
            title: secData.title,
            titleHi: secData.titleHi || null,
            titleHinglish: secData.titleHinglish || null,
            sortOrder: secData.sortOrder
          }
        })
        secId = newSec.id
      }

      // Process checkpoints inside this section
      const existingCheckpoints = existingSections.find(s => s.id === secId)?.checkpoints || []
      const incomingCpIds = secData.checkpoints.map(c => c.id).filter(Boolean) as string[]
      const cpsToDelete = existingCheckpoints.filter(c => !incomingCpIds.includes(c.id))

      // Delete removed checkpoints
      for (const cp of cpsToDelete) {
        await prisma.checkpoint.delete({ where: { id: cp.id } }).catch(() => {
          // If referenced in submissions, keep it
        })
      }

      // Update/Create checkpoints
      for (const cpData of secData.checkpoints) {
        if (cpData.id) {
          await prisma.checkpoint.update({
            where: { id: cpData.id },
            data: {
              name: cpData.name,
              nameHi: cpData.nameHi || null,
              nameHinglish: cpData.nameHinglish || null,
              instructions: cpData.instructions,
              instructionsHi: cpData.instructionsHi || null,
              instructionsHinglish: cpData.instructionsHinglish || null,
              requireImage: cpData.requireImage,
              requireRemarks: cpData.requireRemarks,
              isRequired: cpData.isRequired ?? true,
              referenceImageUrl: cpData.referenceImageUrl || null,
              inputType: cpData.inputType || "PASS_FAIL",
              placeholder: cpData.placeholder || null,
              sortOrder: cpData.sortOrder
            }
          })
        } else {
          await prisma.checkpoint.create({
            data: {
              factoryId,
              sectionId: secId!,
              name: cpData.name,
              nameHi: cpData.nameHi || null,
              nameHinglish: cpData.nameHinglish || null,
              instructions: cpData.instructions,
              instructionsHi: cpData.instructionsHi || null,
              instructionsHinglish: cpData.instructionsHinglish || null,
              requireImage: cpData.requireImage,
              requireRemarks: cpData.requireRemarks,
              isRequired: cpData.isRequired ?? true,
              referenceImageUrl: cpData.referenceImageUrl || null,
              inputType: cpData.inputType || "PASS_FAIL",
              placeholder: cpData.placeholder || null,
              sortOrder: cpData.sortOrder
            }
          })
        }
      }
    }

    revalidatePath('/owner/settings')
    return { success: true, templateId }
  } catch (error: any) {
    console.error('Failed to save template:', error)
    return { error: error.message || 'Failed to save template' }
  }
}

export async function deleteQCTemplate(templateId: string) {
  const session = await getUserSession()
  if (!session) return { error: 'Unauthorized' }
  await guardModuleWrite("quality");

  try {
    // Soft delete template
    await prisma.checklistTemplate.update({
      where: { id: templateId },
      data: { status: 'deleted' }
    })
    revalidatePath('/owner/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete template' }
  }
}

export async function updateCheckpointField(checkpointId: string, field: string, value: any) {
  const session = await getUserSession()
  if (!session) return { error: 'Unauthorized' }
  await guardModuleWrite("quality");
  try {
    const updateData: any = {}
    if (field === 'checkpointName') updateData.name = value
    else if (field === 'instructions') updateData.instructions = value
    else if (field === 'requireImage') updateData.requireImage = (value === 'Yes' || value === 'true' || value === true || value === '1')
    else if (field === 'requireRemarks') updateData.requireRemarks = (value === 'Yes' || value === 'true' || value === true || value === '1')
    
    await prisma.checkpoint.update({
      where: { id: checkpointId },
      data: updateData
    })
    revalidatePath('/owner/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to update checkpoint' }
  }
}

export async function deleteCheckpointAction(checkpointId: string) {
  const session = await getUserSession()
  if (!session) return { error: 'Unauthorized' }
  await guardModuleWrite("quality");
  try {
    await prisma.checkpoint.delete({
      where: { id: checkpointId }
    })
    revalidatePath('/owner/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete checkpoint' }
  }
}

export async function addSectionAction(templateId: string, title: string) {
  const session = await getUserSession()
  if (!session) return { error: 'Unauthorized' }
  await guardModuleWrite("quality");
  try {
    const count = await prisma.templateSection.count({ where: { templateId } })
    const section = await prisma.templateSection.create({
      data: {
        factoryId: session.factoryId,
        templateId,
        title,
        sortOrder: count + 1
      }
    })
    revalidatePath('/owner/settings')
    return { success: true, section }
  } catch (error: any) {
    return { error: error.message || 'Failed to add section' }
  }
}

export async function addCheckpointAction(sectionId: string, name: string) {
  const session = await getUserSession()
  if (!session) return { error: 'Unauthorized' }
  await guardModuleWrite("quality");
  try {
    const count = await prisma.checkpoint.count({ where: { sectionId } })
    const checkpoint = await prisma.checkpoint.create({
      data: {
        factoryId: session.factoryId,
        sectionId,
        name,
        instructions: 'Follow standard check procedures',
        requireImage: false,
        requireRemarks: false,
        sortOrder: count + 1
      }
    })
    revalidatePath('/owner/settings')
    return { success: true, checkpoint }
  } catch (error: any) {
    return { error: error.message || 'Failed to add checkpoint' }
  }
}

export async function deleteSectionAction(sectionId: string) {
  const session = await getUserSession()
  if (!session) return { error: 'Unauthorized' }
  await guardModuleWrite("quality");
  try {
    await prisma.templateSection.delete({
      where: { id: sectionId }
    })
    revalidatePath('/owner/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete section' }
  }
}

/**
 * What a checklist applies to.
 *
 * Both links already exist in the schema, in the direction that lets one
 * checklist serve many things: ItemGroup.defaultChecklists and
 * Department.templateId. So "Seat Cover QC" can cover every seat-cover
 * subcategory and the QC department at once, rather than being locked to one.
 */
export async function getTemplateAssignments(templateId: string) {
  const session = await getUserSession();
  if (!session) throw new Error('Unauthorized');
  await guardModuleAction("quality");
  const user = { factoryId: session.factoryId };

  /*
   * A checklist used to be tickable against item categories, so a template
   * could be the default for "Seat Cover" but not for "Floor Mats". Categories
   * went with the spec engine, so the category list is empty and a template's
   * only assignment is the department that owns it.
   */
  const [departments] = await Promise.all([
    prisma.department.findMany({
      where: { factoryId: user.factoryId, active: true },
      select: { id: true, name: true, isQcStage: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return {
    groups: [] as { id: string; name: string; parentName: string | null; assigned: boolean; takenBy: null }[],
    // Departments are no longer ticked per template: a checklist belongs to one
    // department, chosen in the builder header.
    departments: departments.map((d) => ({ id: d.id, name: d.name, isQcStage: d.isQcStage })),
  };
}

/**
 * Tick or untick one category on one checklist.
 *
 * Categories went with the spec engine, so there is nothing to tick. Kept as a
 * no-op because the settings screen still renders the (now empty) category
 * list, and removing the control is a separate change from removing the data
 * behind it.
 */
export async function setTemplateForItemGroup(
  _groupId: string,
  _templateId: string,
  _assigned: boolean
) {
  const session = await getUserSession();
  if (!session) return { error: 'Unauthorized' };
  await guardModuleWrite("quality");
  return { ok: true };
}
