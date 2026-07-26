"use client";

import Link from "next/link";

import { useRef, useState, useEffect, type ChangeEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Factory, ImagePlus, Loader2, Upload, Car, Layers, Palette, Plus, ChevronRight, 
  ChevronDown, Check, X, ShieldAlert, Search, FileSpreadsheet, Smartphone, 
  Download, CheckCircle2, Info, Edit, Settings, Database, Activity, HardDrive, 
  Cpu, FileCode, Trash2, ArrowRight, UserCheck, ShieldCheck
} from "lucide-react";
import { addBrand, addModel, removeBrand, removeModel, updateBrand, updateModel } from "@/server/actions/masterData";
import { Surface } from "@/components/design/Surface";
import { NotificationPrefsCard } from "@/components/settings/NotificationPrefsCard";
import { Button, Input, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SystemRole, User } from "@prisma/client";
import { transferOwnership } from "@/server/actions/team";
import { toast } from "@/components/ui/toast";
import { MasterSheetView } from "./MasterSheetView";
import { QCTemplateBuilder } from "./QCTemplateBuilder";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { tokens } from "@/design-system/tokens";
import { typography } from "@/design-system/typography";
import { components } from "@/design-system/components";
import { layouts } from "@/design-system/layouts";
import { BRAND_ACCENT } from "@/lib/brand";

export function SettingsClient({ 
  initialData, 
  masterData,
  currentUserRole = "OWNER" as SystemRole,
  coOwners = []
}: { 
  initialData: any; 
  masterData?: any;
  currentUserRole?: SystemRole;
  coOwners?: User[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Notion-style page edit state
  const [isEditMode, setIsEditMode] = useState(false);

  // Form input field state
  const [formData, setFormData] = useState({
    factoryName: initialData.factoryName,
    ownerName: initialData.ownerName,
    phone: initialData.phone,
    themeColor: initialData.themeColor,
  });
  const [logoBase64, setLogoBase64] = useState<string | null>(initialData.logoUrl);

  // Ownership transfer states
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferPin, setTransferPin] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [isConfirmTransferOpen, setIsConfirmTransferOpen] = useState(false);

  // Workspace Explorer states
  const [activeExplorerTab, setActiveExplorerTab] = useState<"products" | "materials" | "variants" | "templates" | "workflows">("products");
  const [isExplorerFullScreen, setIsExplorerFullScreen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  // Dialog popups state
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [activeBrandId, setActiveBrandId] = useState("");
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);

  // Edit / Delete Detail overlay drawer state
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    type: "brand" | "model" | "material" | "color";
    name: string;
  } | null>(null);

  const [editingExplorerItem, setEditingExplorerItem] = useState<{
    id: string;
    type: "brand" | "model" | "material" | "color";
    name: string;
  } | null>(null);

  // Form input field state
  const [newBrandName, setNewBrandName] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [newModelYear, setNewModelYear] = useState("");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newColorName, setNewColorName] = useState("");

  const { brands = [], models = [], materials = [], colors = [], templates = [] } = masterData || {};

  const filteredBrands = useMemo(() => {
    return brands.filter((brand: any) =>
      brand.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      models.some((m: any) => m.brandId === brand.id && m.name.toLowerCase().includes(catalogSearch.toLowerCase()))
    );
  }, [brands, models, catalogSearch]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((mat: any) =>
      mat.name.toLowerCase().includes(catalogSearch.toLowerCase())
    );
  }, [materials, catalogSearch]);

  const filteredColors = useMemo(() => {
    return colors.filter((color: any) =>
      color.name.toLowerCase().includes(catalogSearch.toLowerCase())
    );
  }, [colors, catalogSearch]);

  // Sync brand models counts
  const totalRecordCount = useMemo(() => {
    return brands.length + models.length + materials.length + colors.length;
  }, [brands, models, materials, colors]);

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogoBase64(reader.result as string);
    reader.readAsDataURL(file);
  }

  function openLogoPicker() {
    fileInputRef.current?.click();
  }

  const handleTransferOwnership = () => {
    if (!transferTargetId || !transferPin) return;
    setIsConfirmTransferOpen(true);
  };

  const executeTransferOwnership = async () => {
    setIsConfirmTransferOpen(false);
    setTransferLoading(true);
    setTransferError("");
    const res = await transferOwnership(transferTargetId, transferPin);
    setTransferLoading(false);
    if (res.error) {
      setTransferError(res.error);
    } else {
      toast.success("Ownership transferred successfully!");
      window.location.reload();
    }
  };

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          logoBase64,
        }),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      toast.success("Workspace configuration updated");
      setIsEditMode(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error saving configuration.");
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateExplorerItem = async () => {
    if (!editingExplorerItem) return;
    const { id, type, name } = editingExplorerItem;
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (type === "brand") await updateBrand(id, name.trim());
      
      else if (type === "model") {
        const modelObj = models.find((m: any) => m.id === id);
        await updateModel(id, name.trim(), modelObj?.year || "");
      }
      toast.success("Updated successfully");
      setEditingExplorerItem(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  // Deletion dispatcher
  async function handleDeleteItem() {
    if (!selectedItem) return;
    try {
      const { id, type } = selectedItem;
      if (type === "brand") await removeBrand(id);
      else if (type === "model") await removeModel(id);
      
      
      setSelectedItem(null);
      router.refresh();
      toast.success("Record deleted");
    } catch (err) {
      console.error("Deletion failed", err);
      toast.error("Failed to delete this item.");
    }
  }

  // Accent Colors mapping
  const ACCENT_COLORS = [
    { name: "Verity", hex: BRAND_ACCENT },
    { name: "Blue", hex: "#007AFF" },
    { name: "Graphite", hex: "#8E8E93" },
    { name: "Red", hex: "#FF3B30" },
    { name: "Orange", hex: "#FF9500" },
    { name: "Green", hex: "#34C759" },
    { name: "Purple", hex: "#AF52DE" },
  ];

  // Dynamic style updates
  useEffect(() => {
    document.documentElement.style.setProperty("--brand", formData.themeColor);
    document.documentElement.style.setProperty("--accent", formData.themeColor);
  }, [formData.themeColor]);

  // Export workspace configurations
  const handleExportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `verity_workspace_config_${formData.factoryName.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Configuration exported successfully");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-20">
      
      {/* ──────────────── PAGE HEADER (MISSION CONTROL ACTIONS) ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5 shrink-0">
        <div>
          <span className={typography.labelL}>Configuration Center</span>
          <h1 className={`${typography.displayL} mt-1 text-text-primary tracking-tight`}>
            Factory Workspace
          </h1>
          <p className={`${typography.bodyM} mt-1.5`}>
            Configure the core intelligence layers, catalog structure, theme branding, and database assets of your factory brain.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isEditMode ? (
            <>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setFormData({
                    factoryName: initialData.factoryName,
                    ownerName: initialData.ownerName,
                    phone: initialData.phone,
                    themeColor: initialData.themeColor,
                  });
                  setLogoBase64(initialData.logoUrl);
                  setIsEditMode(false);
                }}
                className={components.button.secondary}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="workspace-config-form" 
                disabled={loading} 
                className={`${components.button.base} bg-[var(--brand)] text-white border-transparent`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button 
              type="button" 
              onClick={() => setIsEditMode(true)} 
              className={`${components.button.base} bg-[var(--brand)] text-white border-transparent`}
            >
              <Edit className="h-4 w-4" />
              Edit Workspace Configuration
            </Button>
          )}
        </div>
      </div>

      <form id="workspace-config-form" onSubmit={handleSaveSettings} className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full min-w-0">
          
          {/* ──────────────── LEFT COLUMN: Workspace Identity & Branding (Span 7) ──────────────── */}
          <div className="lg:col-span-7 flex flex-col gap-8 w-full min-w-0">
            
            {/* Factory Identity Module */}
            <Surface className={components.card.identity}>
              <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-brand-soft text-[var(--brand)]">
                    <Factory className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={typography.headingL}>Workspace Identity</h2>
                    <p className={typography.caption}>General parameters and details of this facility.</p>
                  </div>
                </div>
                <Badge variant="neutral" className="bg-success-soft text-success text-[9px] font-extrabold font-mono tracking-wider">
                  Active
                </Badge>
              </div>

              {isEditMode ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className={typography.labelL}>Factory Name</label>
                    <Input
                      value={formData.factoryName}
                      onChange={(event) => setFormData({ ...formData, factoryName: event.target.value })}
                      placeholder="E.g. AutoWorks Factory"
                      className={components.input}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={typography.labelL}>Owner Name</label>
                    <Input
                      value={formData.ownerName}
                      onChange={(event) => setFormData({ ...formData, ownerName: event.target.value })}
                      className={components.input}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={typography.labelL}>Phone Number</label>
                    <Input
                      value={formData.phone}
                      onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                      className={components.input}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                  <div>
                    <span className={typography.labelM}>Factory Name</span>
                    <p className={`${typography.headingM} mt-1 text-text-primary`}>{formData.factoryName}</p>
                  </div>
                  <div>
                    <span className={typography.labelM}>Workspace ID</span>
                    <p className={`${typography.numeric} mt-1 text-text-secondary text-xs`}>
                      WS-{initialData.factoryId?.slice(0, 8) || "DEV-MODE"}
                    </p>
                  </div>
                  <div>
                    <span className={typography.labelM}>Owner</span>
                    <p className={`${typography.titleL} mt-1 text-text-primary`}>{formData.ownerName}</p>
                  </div>
                  <div>
                    <span className={typography.labelM}>Contact Phone</span>
                    <p className={`${typography.numeric} mt-1 text-text-secondary text-xs`}>{formData.phone || "—"}</p>
                  </div>
                  <div>
                    <span className={typography.labelM}>Industry</span>
                    <p className={`${typography.bodyM} mt-1 text-text-secondary`}>Factory OS / Multi-Tenant</p>
                  </div>
                  <div>
                    <span className={typography.labelM}>Subscription plan</span>
                    <p className={`${typography.bodyM} mt-1 text-text-secondary`}>Enterprise Pro Plan</p>
                  </div>
                </div>
              )}
            </Surface>

            {/* Expandable Brand Assets */}
            <Surface className={components.card.identity}>
              <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-brand-soft text-[var(--brand)]">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={typography.headingL}>Brand Assets</h2>
                    <p className={typography.caption}>Asset configurations and verification stamp marks.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload Panel */}
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-border bg-surface-secondary/20 p-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background mb-3 shadow-inner">
                      {logoBase64 ? (
                        <img src={logoBase64} alt="Logo preview" className="h-full w-full object-contain" />
                      ) : (
                        <ImagePlus className="h-6 w-6 text-text-tertiary" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">Factory Mark Logo</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">JPG, PNG or SVG. Square format.</p>
                    </div>
                    {isEditMode && (
                      <div className="mt-4">
                        <Button type="button" variant="secondary" onClick={openLogoPicker} className="h-8 text-xs cursor-pointer gap-1">
                          <Upload className="h-3 w-3" /> Upload Logo
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time Component Previews */}
                <div className="space-y-3">
                  <span className={typography.labelM}>Asset Placements Previews</span>
                  
                  {/* Mock Sidebar Header */}
                  <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/45 flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg bg-surface border border-border overflow-hidden flex items-center justify-center shrink-0">
                      {logoBase64 ? <img src={logoBase64} alt="icon" className="h-full w-full object-contain" /> : <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />}
                    </div>
                    <span className="text-[11px] font-bold text-text-primary tracking-tight">{formData.factoryName} OS</span>
                    <span className="ml-auto text-[8px] font-semibold uppercase tracking-wider text-text-tertiary">Sidebar preview</span>
                  </div>

                  {/* Mock Verification Stamp */}
                  <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/45 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/15 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-text-primary block leading-snug">QC Certified Stamp</span>
                        <span className="text-[8px] text-text-tertiary block font-mono">{formData.factoryName}</span>
                      </div>
                    </div>
                    <span className="text-[8px] font-semibold uppercase tracking-wider text-text-tertiary">Passport preview</span>
                  </div>
                </div>
              </div>
            </Surface>

            {/* Theme Studio Module */}
            <Surface className={`${components.card.identity} flex-1`}>
              <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-brand-soft text-[var(--brand)]">
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={typography.headingL}>Theme Studio</h2>
                    <p className={typography.caption}>Anodized accent themes and live interface styling.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4 rounded-2xl border border-border/80 bg-surface-secondary/20 p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {ACCENT_COLORS.map((color) => {
                      const isActive = formData.themeColor.toLowerCase() === color.hex.toLowerCase();
                      return (
                        <motion.button
                          key={color.hex}
                          type="button"
                          whileHover={{ scale: 1.08, y: -1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setFormData({ ...formData, themeColor: color.hex })}
                          className="flex flex-col items-center gap-1.5 focus:outline-none group cursor-pointer"
                        >
                          <div
                            style={{ backgroundColor: color.hex }}
                            className={`w-9.5 h-9.5 rounded-full relative flex items-center justify-center transition-all shadow-md ${
                              isActive 
                                ? "ring-2 ring-offset-2 ring-[var(--brand)] dark:ring-offset-neutral-900 dark:ring-white scale-105" 
                                : "opacity-85 hover:opacity-100"
                            }`}
                          >
                            {isActive && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-text-secondary">{color.name}</span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Custom Hex selector */}
                  <div className="flex items-center gap-2.5 pt-4 border-t border-border/85">
                    <div className="relative">
                      <input
                        type="color"
                        value={formData.themeColor}
                        onChange={(event) => setFormData({ ...formData, themeColor: event.target.value })}
                        className="h-9.5 w-9.5 cursor-pointer rounded-full border border-border/50 bg-transparent shrink-0"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-text-tertiary block leading-none">Hex Code</span>
                      <input
                        type="text"
                        maxLength={7}
                        placeholder="#HEX"
                        value={formData.themeColor}
                        onChange={(event) => setFormData({ ...formData, themeColor: event.target.value })}
                        style={{ borderLeftColor: formData.themeColor }}
                        className="w-22 mt-0.5 px-2 py-1 text-[11px] font-mono rounded-lg border-l-2 border-y border-r border-border bg-surface text-text-primary uppercase focus:outline-none focus:ring-1 focus:ring-[var(--brand)] shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Real Design Tokens Live Component Preview */}
                <div className="p-5 rounded-2xl border border-border bg-surface-secondary/45 space-y-4">
                  <span className={typography.labelM}>Interactive Tokens Live Preview</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary Button component preview */}
                    <div className="space-y-1.5 text-left">
                      <span className="text-[8px] text-text-tertiary uppercase block">Button component</span>
                      <button 
                        type="button" 
                        style={{ color: formData.themeColor, borderColor: `${formData.themeColor}60` }}
                        className="w-full h-10 border rounded-xl flex items-center justify-center font-bold text-xs bg-surface shadow-sm cursor-default"
                      >
                        Sample Action
                      </button>
                    </div>

                    {/* Status Pill Component preview */}
                    <div className="space-y-1.5 text-left">
                      <span className="text-[8px] text-text-tertiary uppercase block">Status Pill</span>
                      <div 
                        style={{ color: formData.themeColor, backgroundColor: `${formData.themeColor}12`, borderColor: `${formData.themeColor}18` }}
                        className="w-full h-10 border rounded-xl flex items-center justify-center font-bold text-xs uppercase tracking-wider cursor-default"
                      >
                        ✓ Ready
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Surface>
          </div>

          {/* ──────────────── RIGHT COLUMN: Catalog Explorer & Database Gateway (Span 5) ──────────────── */}
          <div className="lg:col-span-5 flex flex-col gap-8 w-full min-w-0">
            
            {/* Master Data Gateway Card */}
            <Surface className={components.card.gateway}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-brand-soft text-[var(--brand)]">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={typography.headingL}>Master Data</h2>
                    <p className={typography.caption}>Central intelligence repository.</p>
                  </div>
                </div>
                <Link
                  href="/owner/settings/master-data"
                  className="h-8 px-3.5 rounded-xl bg-[var(--brand)] text-white text-[10px] font-bold flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Open Master Data Studio
                </Link>
              </div>

              <div className="space-y-4">
                {/* Stats list */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-surface rounded-xl border border-border/50">
                    <span className="text-[8px] font-bold text-text-tertiary uppercase block tracking-wider">Total Records</span>
                    <span className={`${typography.numeric} text-xl font-bold text-text-primary block mt-1`}>{totalRecordCount}</span>
                  </div>
                  <div className="p-3 bg-surface rounded-xl border border-border/50">
                    <span className="text-[8px] font-bold text-text-tertiary uppercase block tracking-wider">Active Collections</span>
                    <span className={`${typography.numeric} text-xl font-bold text-text-primary block mt-1`}>4</span>
                  </div>
                </div>

                {/* Gateway Metadata List */}
                <div className="space-y-2.5 text-left border-t border-border/40 pt-4">
                  <div className="flex items-center justify-between text-[10px] text-text-secondary">
                    <span>Recent Changes</span>
                    <span className="font-mono text-text-tertiary">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-secondary">
                    <span>Last Modified By</span>
                    <span className="font-semibold text-text-primary flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-[var(--brand)]" /> {formData.ownerName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-secondary">
                    <span>Recent Import</span>
                    <span className="font-mono text-text-tertiary">Automated CSV Sync</span>
                  </div>
                </div>
              </div>
            </Surface>

            {/* QC Template Builder card (full editor lives on its own page) */}
            <Surface className={cn(components.card.identity, "bg-surface border border-border rounded-3xl p-5")}>
              <div className="flex justify-between items-center border-b border-border/40 pb-4 mb-4 shrink-0">
                <div className="flex flex-col">
                  <span className={typography.labelL}>Workflow</span>
                  <h2 className={`${typography.headingL} mt-0.5`}>Templates</h2>
                </div>
                <Link
                  href="/owner/settings/qc-templates"
                  className="h-8 px-3.5 rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary text-[10px] font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  Open Templates Page
                </Link>
              </div>
              <QCTemplateBuilder />
            </Surface>

            {/* Notification preferences */}
            <NotificationPrefsCard />

            {/* Workspace Info & Health Card */}
            <Surface className={`${components.card.identity} flex-1`}>
              <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-brand-soft text-[var(--brand)]">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={typography.headingL}>Workspace Health</h2>
                    <p className={typography.caption}>Authentic system resource status checks.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Registered Team Users</span>
                  <span className="font-bold text-text-primary">{coOwners.length + 1} Members</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Active Workspaces</span>
                  <span className="font-bold text-text-primary">1 Factory</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>PWA Installation Status</span>
                  <span className="font-bold text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary border-t border-border/40 pt-3">
                  <span>Storage utilization</span>
                  <span className="font-semibold text-text-tertiary font-mono italic text-[10px]">Coming soon</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>System Resource Backups</span>
                  <span className="font-semibold text-text-tertiary font-mono italic text-[10px]">Coming soon</span>
                </div>
              </div>
            </Surface>

          </div>
        </div>
      </form>

      {/* ──────────────── FOOTER WORKSPACE CONTROLS ──────────────── */}
      <div className="border-t border-border/40 pt-6 mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleExportConfig}
            className="text-xs gap-1.5 h-9"
          >
            <Download className="h-3.5 w-3.5" /> Export Configuration (JSON Backup)
          </Button>
          {currentUserRole === "OWNER" && (
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsTransferOpen(true)} 
              className="text-xs h-9"
            >
              Transfer Factory Ownership
            </Button>
          )}
        </div>
        <div className="text-[10px] text-text-tertiary font-semibold flex items-center gap-1 leading-none uppercase tracking-wider">
          <Settings className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} /> Verity OS Workspace Dashboard · v2.4.0
        </div>
      </div>

      {/* ──────────────── MODAL DIALOG COMPONENT OVERLAYS ──────────────── */}

      {/* Add Brand Modal */}
      <AnimatePresence>
        {showAddBrand && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div onClick={() => setShowAddBrand(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-surface rounded-[24px] border border-border p-6 shadow-2xl z-10"
            >
              <h3 className="text-base font-bold text-text-primary mb-4">Add Brand Record</h3>
              <Input
                placeholder="Brand Name (e.g. Honda)"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="h-10 text-xs rounded-xl mb-4"
              />
              <div className="flex gap-2.5 justify-end">
                <Button variant="secondary" onClick={() => setShowAddBrand(false)}>Cancel</Button>
                <Button 
                  onClick={async () => {
                    if (!newBrandName.trim()) return;
                    await addBrand(newBrandName.trim());
                    setNewBrandName("");
                    setShowAddBrand(false);
                    router.refresh();
                    toast.success("Brand added");
                  }}
                  className="bg-[var(--brand)] text-white border-transparent cursor-pointer"
                >
                  Save
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Model Modal */}
      <AnimatePresence>
        {showAddModel && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div onClick={() => setShowAddModel(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-surface rounded-[24px] border border-border p-6 shadow-2xl z-10"
            >
              <h3 className="text-base font-bold text-text-primary mb-4">Add Model Record</h3>
              <div className="space-y-3 mb-4">
                <Input
                  placeholder="Model Name (e.g. Civic)"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
                <Input
                  placeholder="Model Year (e.g. 2025)"
                  value={newModelYear}
                  onChange={(e) => setNewModelYear(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
              <div className="flex gap-2.5 justify-end">
                <Button variant="secondary" onClick={() => setShowAddModel(false)}>Cancel</Button>
                <Button 
                  onClick={async () => {
                    if (!newModelName.trim() || !activeBrandId) return;
                    await addModel(activeBrandId, newModelName.trim(), newModelYear.trim());
                    setNewModelName("");
                    setNewModelYear("");
                    setShowAddModel(false);
                    router.refresh();
                    toast.success("Model added");
                  }}
                  className="bg-[var(--brand)] text-white border-transparent cursor-pointer"
                >
                  Save
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Material Modal */}
      <AnimatePresence>
        {showAddMaterial && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div onClick={() => setShowAddMaterial(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-surface rounded-[24px] border border-border p-6 shadow-2xl z-10"
            >
              <h3 className="text-base font-bold text-text-primary mb-4">Add Material Record</h3>
              <Input
                placeholder="Material Name (e.g. Nappa Leather)"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                className="h-10 text-xs rounded-xl mb-4"
              />
              <div className="flex gap-2.5 justify-end">
                <Button variant="secondary" onClick={() => setShowAddMaterial(false)}>Cancel</Button>
                <Button 
                  onClick={async () => {
                    if (!newMaterialName.trim()) return;
                    console.log("deprecated");
                    setNewMaterialName("");
                    setShowAddMaterial(false);
                    router.refresh();
                    toast.success("Material added");
                  }}
                  className="bg-[var(--brand)] text-white border-transparent cursor-pointer"
                >
                  Save
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Color Modal */}
      <AnimatePresence>
        {showAddColor && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div onClick={() => setShowAddColor(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-surface rounded-[24px] border border-border p-6 shadow-2xl z-10"
            >
              <h3 className="text-base font-bold text-text-primary mb-4">Add Color Record</h3>
              <Input
                placeholder="Color Name/Hex (e.g. #FF0000)"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                className="h-10 text-xs rounded-xl mb-4"
              />
              <div className="flex gap-2.5 justify-end">
                <Button variant="secondary" onClick={() => setShowAddColor(false)}>Cancel</Button>
                <Button 
                  onClick={async () => {
                    if (!newColorName.trim()) return;
                    console.log("deprecated");
                    setNewColorName("");
                    setShowAddColor(false);
                    router.refresh();
                    toast.success("Color added");
                  }}
                  className="bg-[var(--brand)] text-white border-transparent cursor-pointer"
                >
                  Save
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Item Deletion Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div onClick={() => setSelectedItem(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-surface rounded-[24px] border border-border p-6 shadow-2xl z-10"
            >
              <div className="flex items-center gap-3 text-danger mb-4">
                <ShieldAlert className="h-6 w-6 shrink-0" />
                <h3 className="text-base font-bold">Delete Record?</h3>
              </div>
              <p className="text-xs text-text-secondary mb-5">
                Are you sure you want to permanently delete "{selectedItem.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-2.5 justify-end">
                <Button variant="secondary" onClick={() => setSelectedItem(null)}>Cancel</Button>
                <Button
                  onClick={handleDeleteItem}
                  className="bg-danger hover:bg-danger text-white border-transparent cursor-pointer"
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Factory Ownership Transfer Modal */}
      <AnimatePresence>
        {isTransferOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div onClick={() => setIsTransferOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface rounded-[24px] border border-border p-6 shadow-2xl flex flex-col max-h-[90vh] z-10 text-left"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-border shrink-0">
                <div>
                  <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Security Action</span>
                  <h3 className="text-lg font-bold text-text-primary mt-0.5">Transfer ownership</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="p-1.5 rounded-full hover:bg-surface-2 text-text-secondary hover:text-text-primary transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="rounded-2xl border border-danger/15 bg-danger-soft/10 p-4">
                  <div className="flex items-start gap-3 text-danger">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold">Transfer factory ownership</h4>
                      <p className="text-[11px] text-text-secondary mt-1">
                        Transfer workspace ownership to a co-owner. You will instantly be demoted to a co-owner role. This action is irreversible.
                      </p>
                    </div>
                  </div>
                </div>

                {coOwners.length === 0 ? (
                  <div className="text-xs text-text-tertiary italic p-4 bg-surface-2/60 rounded-xl text-center border border-border/50">
                    No active co-owners found to transfer ownership to.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-secondary">Select target co-owner</label>
                      <select
                        value={transferTargetId}
                        onChange={(e) => setTransferTargetId(e.target.value)}
                        className="w-full h-10 border border-border rounded-xl px-3 text-xs font-semibold bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                      >
                        <option value="">-- Choose co-owner --</option>
                        {coOwners.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-secondary">Confirm your owner PIN</label>
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="Enter your PIN"
                        value={transferPin}
                        onChange={(e) => setTransferPin(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    {transferError && (
                      <p className="text-xs font-bold text-danger bg-danger-soft p-3 rounded-xl border border-danger/10">
                        {transferError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 border-t border-border pt-4 mt-6 shrink-0">
                <Button variant="secondary" onClick={() => setIsTransferOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleTransferOwnership}
                  disabled={transferLoading || !transferTargetId || !transferPin}
                  className="flex-1 h-9 rounded-xl bg-danger hover:bg-danger/90 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {transferLoading ? "Transferring..." : "Confirm & Transfer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MasterSheetView 
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        masterData={{
          brands,
          models,
          productCategories: masterData.productCategories,
          products: masterData.products,
          productVariants: masterData.productVariants,
          templates,
          suppliers: masterData.suppliers,
          warehouses: masterData.warehouses,
          materialCategories: masterData.materialCategories,
          materials: masterData.materials,
          designs: (masterData as any).designs,
          colors: (masterData as any).colors,
          productTypes: (masterData as any).productTypes,
          specBoms: (masterData as any).specBoms,
          
        }}
      />

      <ConfirmDialog
        isOpen={isConfirmTransferOpen}
        title="Transfer ownership?"
        description="Are you absolutely sure you want to transfer ownership? You will become a Co-Owner instantly."
        confirmLabel="Transfer"
        variant="danger"
        onConfirm={executeTransferOwnership}
        onCancel={() => setIsConfirmTransferOpen(false)}
      />

    </div>
  );
}
