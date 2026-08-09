"use client";

import { useState } from "react";
import { Network, Plus, ArrowRight, Save, Route, Layers, ShieldCheck, Box } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function BlueprintBuilderClient({ item, initialBlueprint, departments, materials }: any) {
  const [activeTab, setActiveTab] = useState<"route" | "bom" | "qc">("route");
  
  // Local state for interactive building
  const [routeSteps, setRouteSteps] = useState(initialBlueprint?.routeSteps || []);
  const [boms, setBoms] = useState(initialBlueprint?.boms || []);

  const handleAddStep = (deptId: string) => {
    const dept = departments.find((d: any) => d.id === deptId);
    if (!dept) return;
    
    setRouteSteps((prev: any[]) => [
      ...prev,
      {
        id: `temp-${dept.id}-${prev.length + 1}`,
        departmentId: dept.id,
        department: dept,
        sequence: prev.length + 1,
        estimatedMinutes: 60
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-text-tertiary mb-1">
            <Network className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Blueprint Builder</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            {item.group?.name ?? "Item"}
            <span className="text-text-tertiary font-normal">/</span> 
            {item.name}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand)] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand)]"></span>
            </span>
            Draft v{initialBlueprint.version}
          </div>
          <Button className="h-9 gap-2">
            <Save className="h-4 w-4" /> Save & Publish
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-background">
        {/* Left Toolbar */}
        <div className="w-64 border-r border-border bg-surface-2 p-4 flex flex-col gap-6 shrink-0 overflow-y-auto">
          
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3 px-2">Builder Mode</h3>
            {[
              { id: "route", icon: <Route className="h-4 w-4" />, label: "Routing & Steps" },
              { id: "bom", icon: <Layers className="h-4 w-4" />, label: "Bill of Materials" },
              { id: "qc", icon: <ShieldCheck className="h-4 w-4" />, label: "Quality Passports" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab.id 
                    ? "bg-white shadow-sm border border-border text-[var(--brand-strong)]"
                    : "text-text-secondary hover:bg-black/5 hover:text-text-primary"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="h-px bg-border my-2" />

          {activeTab === "route" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2 px-2">Drag to add step</h3>
              {departments.map((dept: any) => (
                <button
                  key={dept.id}
                  onClick={() => handleAddStep(dept.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-text-secondary hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors text-left"
                >
                  {dept.name}
                  <Plus className="h-4 w-4 opacity-50" />
                </button>
              ))}
            </div>
          )}
          
          {activeTab === "bom" && (
             <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2 px-2">Available Materials</h3>
              {materials.map((mat: any) => (
                <button
                  key={mat.id}
                  className="flex w-full items-center justify-between rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-text-secondary hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors text-left"
                >
                  <span className="truncate">{mat.name}</span>
                  <Plus className="h-4 w-4 opacity-50 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-8 relative bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] bg-background">
          <div className="max-w-4xl mx-auto">
            {activeTab === "route" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface border border-border shadow-sm text-text-tertiary">
                    <Box className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">Manufacturing Route</h2>
                </div>
                
                <div className="flex flex-col gap-4 pl-6 relative">
                  {routeSteps.map((step: any, idx: number) => (
                    <div key={step.id} className="relative">
                      {idx > 0 && (
                        <div className="absolute -top-6 left-6 h-6 w-0.5 bg-border" />
                      )}
                      
                      <div className="flex items-center gap-4 group">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--brand)] bg-white font-bold text-[var(--brand)] shadow-sm z-10 relative">
                          {idx + 1}
                        </div>
                        
                        <div className="flex-1 rounded-xl border border-border bg-surface p-4 shadow-sm group-hover:border-[var(--brand)]/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-text-primary text-base">{step.department.name}</h3>
                            <div className="text-xs text-text-secondary">Est: {step.estimatedMinutes} mins</div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button variant="secondary"  className="h-7 text-xs bg-surface-2 border-dashed">
                              <Layers className="h-3 w-3 mr-1.5" /> + BOM
                            </Button>
                            <Button variant="secondary"  className="h-7 text-xs bg-surface-2 border-dashed">
                              <ShieldCheck className="h-3 w-3 mr-1.5" /> + QC
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {routeSteps.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2/50 p-12 text-center">
                      <Route className="h-8 w-8 text-text-tertiary mb-4 opacity-50" />
                      <p className="text-sm font-medium text-text-primary">No route steps defined</p>
                      <p className="text-xs text-text-secondary mt-1">Click a department on the left to add it to the sequence.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "bom" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface border border-border shadow-sm text-text-tertiary">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">Bill of Materials</h2>
                </div>
                <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-2 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-text-secondary">Material</th>
                        <th className="px-4 py-3 font-semibold text-text-secondary">SKU</th>
                        <th className="px-4 py-3 font-semibold text-text-secondary">Quantity</th>
                        <th className="px-4 py-3 font-semibold text-text-secondary">Station</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boms.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-text-tertiary">
                            No materials added to this blueprint yet.
                          </td>
                        </tr>
                      ) : (
                        boms.map((bom: any) => (
                          <tr key={bom.id} className="border-b border-border/50">
                            <td className="px-4 py-3 font-medium text-text-primary">{bom.material.name}</td>
                            <td className="px-4 py-3 text-text-secondary font-mono text-xs">{bom.material.sku}</td>
                            <td className="px-4 py-3 font-medium">{bom.quantity} <span className="text-text-tertiary text-xs ml-1">{bom.material.uom}</span></td>
                            <td className="px-4 py-3 text-text-secondary">Any</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeTab === "qc" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface border border-border shadow-sm text-text-tertiary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">Quality Passports</h2>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2/50 p-12 text-center">
                  <p className="text-sm font-medium text-text-primary">Templates</p>
                  <p className="text-xs text-text-secondary mt-1">Assign templates to specific route steps.</p>
                  <Button variant="secondary" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" /> Select Template
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
