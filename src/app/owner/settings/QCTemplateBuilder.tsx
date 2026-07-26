"use client";

import { useState, useEffect } from "react";
import { confirmDialog } from "@/components/ui/dialog-service";
import {
  Plus, Trash2, Check, X, FileText, ArrowLeft, Settings,
  Smartphone, Languages, Camera, FileEdit, HelpCircle, Loader2,
  Download, FileSpreadsheet
} from "lucide-react";
import Papa from "papaparse";
import { getQCTemplates, saveQCTemplate, deleteQCTemplate, getTemplateProducts } from "@/server/actions/qc-templates";
import { importMasterCsvExtra } from "@/server/actions/masterData";
import { toast } from "@/components/ui/toast";
import { Button, Input } from "@/components/ui/primitives";
import { components } from "@/design-system/components";

type CheckpointInput = {
  id?: string;
  name: string;
  nameHi?: string;
  nameHinglish?: string;
  instructions: string;
  instructionsHi?: string;
  instructionsHinglish?: string;
  requireImage: boolean;
  requireRemarks: boolean;
  sortOrder: number;
};

type SectionInput = {
  id?: string;
  title: string;
  titleHi?: string;
  titleHinglish?: string;
  sortOrder: number;
  checkpoints: CheckpointInput[];
};

type TemplateInput = {
  id?: string;
  name: string;
  requiresVideo: boolean;
  sections: SectionInput[];
  productIds: string[];
};

export function QCTemplateBuilder() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<TemplateInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string; category?: { name: string } | null }>>([]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await getQCTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTemplates();
    void getTemplateProducts().then(setProducts).catch(() => {});
  }, []);

  const handleCreateNew = () => {
    setEditingTemplate({
      name: "New Template",
      requiresVideo: false,
      productIds: [],
      sections: [
        {
          title: "Initial Inspection",
          sortOrder: 1,
          checkpoints: [
            {
              name: "Check Thread Alignment",
              instructions: "Verify thread spacing is exactly 3mm from edge.",
              requireImage: false,
              requireRemarks: false,
              sortOrder: 1
            }
          ]
        }
      ]
    });
  };

  const handleEdit = (tpl: any) => {
    setEditingTemplate({
      id: tpl.id,
      name: tpl.name,
      requiresVideo: !!tpl.requiresVideo,
      productIds: (tpl.products ?? []).map((p: any) => p.id),
      sections: tpl.sections.map((s: any) => ({
        id: s.id,
        title: s.title,
        titleHi: s.titleHi || "",
        titleHinglish: s.titleHinglish || "",
        sortOrder: s.sortOrder,
        checkpoints: s.checkpoints.map((c: any) => ({
          id: c.id,
          name: c.name,
          nameHi: c.nameHi || "",
          nameHinglish: c.nameHinglish || "",
          instructions: c.instructions,
          instructionsHi: c.instructionsHi || "",
          instructionsHinglish: c.instructionsHinglish || "",
          requireImage: c.requireImage,
          requireRemarks: c.requireRemarks,
          sortOrder: c.sortOrder
        }))
      }))
    });
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: "Are you sure you want to delete this template?", variant: "danger", confirmLabel: "Delete" }))) return;
    try {
      const res = await deleteQCTemplate(id);
      if (res.success) {
        toast.success("Template deleted successfully");
        void fetchTemplates();
      } else {
        toast.error(res.error || "Failed to delete");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const CSV_HEADERS = ["Template", "Section", "Checkpoint", "Instructions", "Require Image", "Require Remarks"];

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const rows = templates.flatMap((tpl: any) =>
      tpl.sections.flatMap((sec: any) =>
        sec.checkpoints.map((cp: any) => ({
          Template: tpl.name,
          Section: sec.title,
          Checkpoint: cp.name,
          Instructions: cp.instructions ?? "",
          "Require Image": cp.requireImage ? "Yes" : "No",
          "Require Remarks": cp.requireRemarks ? "Yes" : "No",
        }))
      )
    );
    if (rows.length === 0) {
      toast.error("No templates to export yet");
      return;
    }
    downloadCsv(Papa.unparse(rows, { columns: CSV_HEADERS }), "Verity_qc_templates.csv");
  };

  const handleDownloadSample = () => {
    downloadCsv(
      Papa.unparse([
        { Template: "Car Seat Cover Quality Checks", Section: "Stitching", Checkpoint: "Stitch Alignment", Instructions: "Check 4mm spacing", "Require Image": "Yes", "Require Remarks": "No" },
        { Template: "Car Seat Cover Quality Checks", Section: "Stitching", Checkpoint: "Thread Tension", Instructions: "No loose threads on seams", "Require Image": "No", "Require Remarks": "Yes" },
        { Template: "Car Seat Cover Quality Checks", Section: "Fitment", Checkpoint: "Headrest Fit", Instructions: "Cover sits flush on headrest", "Require Image": "Yes", "Require Remarks": "No" },
      ], { columns: CSV_HEADERS }),
      "Verity_qc_templates_sample.csv"
    );
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await importMasterCsvExtra("templates", results.data as any[]);
          toast.success(`Imported ${(res as any).imported} rows`);
          void fetchTemplates();
        } catch (err: any) {
          toast.error(err.message || "Import failed");
        } finally {
          e.target.value = "";
        }
      },
    });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await saveQCTemplate(editingTemplate as any);
      if (res.success) {
        toast.success("Template saved successfully");
        setEditingTemplate(null);
        void fetchTemplates();
      } else {
        toast.error(res.error || "Failed to save template");
      }
    } catch (err) {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    if (!editingTemplate) return;
    const nextOrder = editingTemplate.sections.length + 1;
    setEditingTemplate({
      ...editingTemplate,
      sections: [
        ...editingTemplate.sections,
        {
          title: `Section ${nextOrder}`,
          sortOrder: nextOrder,
          checkpoints: []
        }
      ]
    });
  };

  const removeSection = (secIdx: number) => {
    if (!editingTemplate) return;
    const nextSections = editingTemplate.sections.filter((_, idx) => idx !== secIdx);
    // Recalculate sort orders
    nextSections.forEach((s, idx) => {
      s.sortOrder = idx + 1;
    });
    setEditingTemplate({
      ...editingTemplate,
      sections: nextSections
    });
  };

  const updateSectionTitle = (secIdx: number, fields: Partial<SectionInput>) => {
    if (!editingTemplate) return;
    const nextSections = [...editingTemplate.sections];
    nextSections[secIdx] = {
      ...nextSections[secIdx],
      ...fields
    };
    setEditingTemplate({
      ...editingTemplate,
      sections: nextSections
    });
  };

  const addCheckpoint = (secIdx: number) => {
    if (!editingTemplate) return;
    const nextSections = [...editingTemplate.sections];
    const nextOrder = nextSections[secIdx].checkpoints.length + 1;
    nextSections[secIdx].checkpoints.push({
      name: "New Checkpoint",
      instructions: "Follow instructions to verify quality.",
      requireImage: false,
      requireRemarks: false,
      sortOrder: nextOrder
    });
    setEditingTemplate({
      ...editingTemplate,
      sections: nextSections
    });
  };

  const removeCheckpoint = (secIdx: number, cpIdx: number) => {
    if (!editingTemplate) return;
    const nextSections = [...editingTemplate.sections];
    nextSections[secIdx].checkpoints = nextSections[secIdx].checkpoints.filter((_, idx) => idx !== cpIdx);
    // Recalculate sort orders
    nextSections[secIdx].checkpoints.forEach((c, idx) => {
      c.sortOrder = idx + 1;
    });
    setEditingTemplate({
      ...editingTemplate,
      sections: nextSections
    });
  };

  const updateCheckpoint = (secIdx: number, cpIdx: number, fields: Partial<CheckpointInput>) => {
    if (!editingTemplate) return;
    const nextSections = [...editingTemplate.sections];
    nextSections[secIdx].checkpoints[cpIdx] = {
      ...nextSections[secIdx].checkpoints[cpIdx],
      ...fields
    };
    setEditingTemplate({
      ...editingTemplate,
      sections: nextSections
    });
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Load templates...
      </div>
    );
  }

  if (editingTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setEditingTemplate(null)}
              className="p-1.5 hover:bg-surface-2 dark:hover:bg-neutral-800 rounded-lg text-text-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Template Builder</span>
              <input 
                type="text"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                className="text-lg font-bold text-text-primary bg-transparent border-b border-transparent hover:border-border dark:hover:border-neutral-750 focus:border-brand outline-none pb-0.5 px-0.5"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Save Template
            </Button>
          </div>
        </div>

        {/* Applies-to-products selector: which products run this template. None
            selected = the factory-wide default used when a product has no
            template of its own (e.g. mats get their own, the rest fall back). */}
        <div className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">Applies to products</span>
            <span className="text-[11px] text-text-tertiary">
              {editingTemplate.productIds.length === 0 ? "— none selected: used as the default template" : `${editingTemplate.productIds.length} selected`}
            </span>
          </div>
          {products.length === 0 ? (
            <p className="text-xs text-text-tertiary">No products yet. Add products in Master Data to scope templates per product.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {products.map((p) => {
                const on = editingTemplate.productIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setEditingTemplate({
                      ...editingTemplate,
                      productIds: on
                        ? editingTemplate.productIds.filter((id) => id !== p.id)
                        : [...editingTemplate.productIds, p.id],
                    })}
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-border bg-surface text-text-secondary hover:border-[var(--brand)]/50"}`}
                  >
                    {p.name}{p.category?.name ? <span className="opacity-60"> · {p.category.name}</span> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Walkthrough video requirement: when on, the worker must attach a
            video before submitting and the supervisor must review it before
            sign-off. Photos are still set per-checkpoint ("Require Camera Snap"),
            so a section can demand several images and the inspection one video. */}
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-4 cursor-pointer">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">Require walkthrough video</span>
            <p className="mt-0.5 text-[11px] text-text-tertiary">Worker records one video of the finished piece; supervisor approves it.</p>
          </div>
          <input
            type="checkbox"
            checked={editingTemplate.requiresVideo}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, requiresVideo: e.target.checked })}
            className="h-5 w-5 shrink-0 accent-[var(--brand)] cursor-pointer"
          />
        </label>

        {/* Builder Sections Area */}
        <div className="space-y-6 pr-1">
          {editingTemplate.sections.map((sec, secIdx) => (
            <div key={secIdx} className="rounded-2xl border border-border bg-surface-secondary dark:bg-neutral-800 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-text-secondary uppercase">Section Name</label>
                  <Input 
                    value={sec.title}
                    onChange={(e) => updateSectionTitle(secIdx, { title: e.target.value })}
                    placeholder="e.g. Back Stitching"
                    className="mt-1 text-xs"
                  />
                </div>
                <button 
                  onClick={() => removeSection(secIdx)}
                  className="mt-6 p-1.5 hover:bg-danger/10 hover:text-danger text-text-tertiary rounded-lg transition-all"
                  title="Remove Section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Checkpoints List */}
              <div className="space-y-4 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary">Inspection Checkpoints</span>
                  <button 
                    onClick={() => addCheckpoint(secIdx)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[var(--brand)] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Checkpoint
                  </button>
                </div>

                <div className="space-y-3">
                  {sec.checkpoints.map((cp, cpIdx) => (
                    <div key={cpIdx} className="bg-white dark:bg-neutral-900 rounded-xl border border-border p-4 space-y-3 shadow-xs">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-xs font-bold text-text-tertiary mt-1.5">{cpIdx + 1}</span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-semibold text-text-tertiary uppercase">Check Title</label>
                            <Input 
                              value={cp.name}
                              onChange={(e) => updateCheckpoint(secIdx, cpIdx, { name: e.target.value })}
                              placeholder="Checkpoint name"
                              className="mt-0.5 text-xs"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => removeCheckpoint(secIdx, cpIdx)}
                          className="p-1 hover:bg-danger/10 hover:text-danger text-text-tertiary rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Instructions Row */}
                      <div>
                        <label className="text-[9px] font-semibold text-text-tertiary uppercase">Instructions</label>
                        <textarea 
                          value={cp.instructions}
                          onChange={(e) => updateCheckpoint(secIdx, cpIdx, { instructions: e.target.value })}
                          placeholder="Inspection instructions..."
                          className="mt-0.5 w-full text-xs p-2 bg-white dark:bg-neutral-950 border border-border rounded-lg focus:outline-none focus:border-[var(--brand)] h-12 resize-none text-text-primary"
                        />
                      </div>

                      {/* Toggle Options */}
                      <div className="flex items-center gap-4 pt-1 text-xs">
                        <label className="flex items-center gap-2 font-medium text-text-secondary cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={cp.requireImage}
                            onChange={(e) => updateCheckpoint(secIdx, cpIdx, { requireImage: e.target.checked })}
                            className="rounded text-brand focus:ring-brand accent-[var(--brand)]"
                          />
                          <span>Require Camera Snap Verification</span>
                        </label>

                        <label className="flex items-center gap-2 font-medium text-text-secondary cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={cp.requireRemarks}
                            onChange={(e) => updateCheckpoint(secIdx, cpIdx, { requireRemarks: e.target.checked })}
                            className="rounded text-brand focus:ring-brand accent-[var(--brand)]"
                          />
                          <span>Mandatory Remarks on Failure</span>
                        </label>
                      </div>
                    </div>
                  ))}

                  {sec.checkpoints.length === 0 && (
                    <div className="text-center py-4 border border-dashed border-border rounded-xl text-xs text-text-tertiary">
                      No checkpoints. Click "Add Checkpoint" to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <Button variant="secondary" onClick={addSection} className="w-full border-dashed">
            <Plus className="w-4 h-4 mr-2" /> Add New Section
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="min-w-[200px]">
          <h3 className="text-base font-bold text-text-primary whitespace-nowrap">Templates</h3>
          <p className="text-xs text-text-secondary mt-0.5">Customize checkpoints and inspection scripts for workers.</p>
        </div>
        {/* Uniform h-9 controls so the toolbar reads as one row and never wraps mid-button */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={handleExportCsv} className="h-9 gap-1.5 whitespace-nowrap text-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <input type="file" id="qcTemplateCsvUpload" accept=".csv" className="hidden" onChange={handleImportCsv} />
          <label
            htmlFor="qcTemplateCsvUpload"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-surface px-3.5 text-xs font-semibold text-text-secondary transition hover:text-text-primary"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Import CSV
          </label>
          <Button variant="secondary" onClick={handleDownloadSample} className="h-9 whitespace-nowrap text-xs">
            Sample
          </Button>
          <Button variant="primary" onClick={handleCreateNew} className="h-9 gap-1.5 whitespace-nowrap text-xs">
            <Plus className="w-4 h-4" /> Build Template
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {templates.map((tpl) => (
          <div key={tpl.id} className="rounded-xl border border-border bg-white dark:bg-neutral-800 p-4 flex items-center justify-between hover:border-border dark:hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-soft text-[var(--brand)]">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-text-primary">{tpl.name}</span>
                <span className="text-[10px] text-text-secondary mt-0.5">
                  {tpl.sections.length} sections · {tpl.sections.reduce((acc: number, s: any) => acc + s.checkpoints.length, 0)} checkpoints
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(tpl.products ?? []).length === 0 ? (
                    <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[9px] font-semibold text-text-tertiary">Default (all products)</span>
                  ) : (
                    (tpl.products ?? []).map((p: any) => (
                      <span key={p.id} className="rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-2 py-0.5 text-[9px] font-semibold text-[var(--brand)]">{p.name}</span>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleEdit(tpl)}
                className="p-1.5 hover:bg-surface-2 dark:hover:bg-neutral-700 text-text-secondary rounded-lg"
                title="Edit Template"
              >
                <FileEdit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(tpl.id)}
                className="p-1.5 hover:bg-danger/10 hover:text-danger text-text-tertiary rounded-lg"
                title="Delete Template"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-10 border border-dashed border-border rounded-xl text-sm text-text-tertiary">
            No templates configured yet. Click "Build Template" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
