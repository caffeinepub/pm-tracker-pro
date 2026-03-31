import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Download,
  Edit2,
  FileDown,
  FileSpreadsheet,
  Package,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type { SpareItem } from "../context/AppContext";
import { useApp } from "../context/AppContext";

const XLSX = (window as any).XLSX;

const EMPTY_FORM = {
  partName: "",
  partSpec: "",
  qtyInStock: 0,
  minStockLevel: 0,
  unit: "Nos",
  costPerUnit: 0,
  applicableMachineSection: "",
};

class SpareErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "oklch(0.165 0.022 252)" }}
        >
          <div className="text-center p-8">
            <AlertTriangle
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: "oklch(0.80 0.180 55)" }}
            />
            <p className="text-lg font-semibold mb-2">Spares Page Error</p>
            <p
              className="text-sm mb-4"
              style={{ color: "oklch(0.65 0.010 260)" }}
            >
              {this.state.error}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "oklch(0.55 0.15 252)", color: "white" }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SparesPage() {
  return (
    <SpareErrorBoundary>
      <SparesPageInner />
    </SpareErrorBoundary>
  );
}

function SparesPageInner() {
  const {
    user,
    spareItems,
    addSpareItem,
    updateSpareItem,
    deleteSpareItem,
    importSpareItems,
    navigate,
  } = useApp();

  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "admin";

  const filtered = spareItems.filter(
    (s) =>
      s.partName.toLowerCase().includes(search.toLowerCase()) ||
      s.applicableMachineSection.toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setShowDialog(true);
  }

  function openEdit(item: SpareItem) {
    setForm({
      partName: item.partName,
      partSpec: item.partSpec,
      qtyInStock: item.qtyInStock,
      minStockLevel: item.minStockLevel,
      unit: item.unit,
      costPerUnit: item.costPerUnit,
      applicableMachineSection: item.applicableMachineSection,
    });
    setEditId(item.id);
    setShowDialog(true);
  }

  function handleSave() {
    if (!form.partName.trim()) {
      toast.error("Part name is required");
      return;
    }
    if (editId) {
      updateSpareItem(editId, { ...form });
      toast.success("Spare updated");
    } else {
      addSpareItem({
        id: `spare-${Date.now()}`,
        ...form,
        createdAt: Date.now(),
      });
      toast.success("Spare added");
    }
    setShowDialog(false);
  }

  function handleDelete(id: string) {
    deleteSpareItem(id);
    toast.success("Spare deleted");
  }

  function handleExport() {
    if (!XLSX) {
      toast.error("XLSX not available");
      return;
    }
    const data = spareItems.map((s) => ({
      "Part Name": s.partName,
      "Part Specification": s.partSpec,
      "Qty In Stock": s.qtyInStock,
      "Min Stock Level": s.minStockLevel,
      Unit: s.unit,
      "Cost Per Unit": s.costPerUnit,
      "Applicable Machine/Section": s.applicableMachineSection,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Spares");
    XLSX.writeFile(
      wb,
      `CriticalSpares_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }

  function handleTemplateDownload() {
    if (!XLSX) {
      toast.error("XLSX not available");
      return;
    }
    const template = [
      {
        "Part Name": "V-Belt A60",
        "Part Specification": "A60 5L Standard",
        "Qty In Stock": 5,
        "Min Stock Level": 2,
        Unit: "Nos",
        "Cost Per Unit": 250,
        "Applicable Machine/Section": "Powder Coating",
      },
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, "Spares");
    XLSX.writeFile(wb, "Spares_Import_Template.xlsx");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result as ArrayBuffer, {
          type: "array",
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];
        const items: SpareItem[] = rows.map((row, idx) => ({
          id: `spare-import-${Date.now()}-${idx}`,
          partName: String(row.PartName ?? row["Part Name"] ?? ""),
          partSpec: String(
            row.PartSpecification ?? row["Part Specification"] ?? "",
          ),
          qtyInStock: Number(row.QtyInStock ?? row["Qty In Stock"] ?? 0),
          minStockLevel: Number(
            row.MinStockLevel ?? row["Min Stock Level"] ?? 0,
          ),
          unit: String(row.Unit ?? "Nos"),
          costPerUnit: Number(row.CostPerUnit ?? row["Cost Per Unit"] ?? 0),
          applicableMachineSection: String(
            row.ApplicableMachineSection ??
              row["Applicable Machine/Section"] ??
              "",
          ),
          createdAt: Date.now(),
        }));
        importSpareItems(items);
        toast.success(`Imported ${items.length} spare items`);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  const inputStyle = {
    background: "oklch(0.19 0.020 255)",
    borderColor: "oklch(0.34 0.030 252)",
    color: "oklch(0.88 0.010 260)",
  };

  return (
    <>
      <MorningPopup />
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "oklch(0.165 0.022 252)" }}
      >
        <header
          className="sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between"
          style={{
            background: "oklch(0.19 0.020 255)",
            borderColor: "oklch(0.34 0.030 252)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "oklch(0.48 0.13 200 / 0.15)",
                border: "1px solid oklch(0.48 0.13 200 / 0.3)",
              }}
            >
              <Package
                className="w-4 h-4"
                style={{ color: "oklch(0.70 0.14 200)" }}
              />
            </div>
            <span
              className="text-lg font-bold"
              style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
            >
              Critical{" "}
              <span style={{ color: "oklch(0.70 0.14 200)" }}>Spare List</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("dashboard")}
              style={{
                borderColor: "oklch(0.34 0.030 252)",
                color: "oklch(0.68 0.010 260)",
                fontSize: "12px",
              }}
            >
              Dashboard
            </Button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
            <Input
              data-ocid="spares.search_input"
              placeholder="Search parts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              style={inputStyle}
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={handleExport}
                data-ocid="spares.export.button"
                style={{
                  background: "oklch(0.30 0.060 145 / 0.25)",
                  color: "oklch(0.75 0.13 145)",
                  border: "1px solid oklch(0.52 0.12 145 / 0.4)",
                  fontSize: "12px",
                }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Export Excel
              </Button>
              {isAdmin && (
                <>
                  <Button
                    size="sm"
                    onClick={handleTemplateDownload}
                    data-ocid="spares.template.button"
                    style={{
                      background: "oklch(0.28 0.022 252)",
                      color: "oklch(0.68 0.010 260)",
                      border: "1px solid oklch(0.34 0.030 252)",
                      fontSize: "12px",
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Template
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => importRef.current?.click()}
                    data-ocid="spares.upload_button"
                    style={{
                      background: "oklch(0.28 0.022 252)",
                      color: "oklch(0.68 0.010 260)",
                      border: "1px solid oklch(0.34 0.030 252)",
                      fontSize: "12px",
                    }}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" /> Import
                  </Button>
                  <input
                    ref={importRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImport}
                  />
                  <Button
                    size="sm"
                    onClick={openAdd}
                    data-ocid="spares.primary_button"
                    style={{
                      background: "oklch(0.48 0.13 200 / 0.20)",
                      color: "oklch(0.70 0.14 200)",
                      border: "1px solid oklch(0.48 0.13 200 / 0.4)",
                      fontSize: "12px",
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Spare
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              {
                label: "Total Parts",
                value: spareItems.length,
                color: "oklch(0.70 0.14 200)",
              },
              {
                label: "Low Stock",
                value: spareItems.filter((s) => s.qtyInStock <= s.minStockLevel)
                  .length,
                color: "oklch(0.78 0.17 27)",
              },
              {
                label: "Total Value",
                value: `₹${spareItems.reduce((sum, s) => sum + s.qtyInStock * s.costPerUnit, 0).toLocaleString()}`,
                color: "oklch(0.80 0.180 55)",
              },
              {
                label: "OK Stock",
                value: spareItems.filter((s) => s.qtyInStock > s.minStockLevel)
                  .length,
                color: "oklch(0.75 0.13 145)",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl p-3"
                style={{
                  background: "oklch(0.19 0.020 255)",
                  border: "1px solid oklch(0.28 0.022 252)",
                }}
              >
                <p
                  className="text-xs mb-1"
                  style={{ color: "oklch(0.55 0.010 260)" }}
                >
                  {kpi.label}
                </p>
                <p className="text-xl font-bold" style={{ color: kpi.color }}>
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid oklch(0.28 0.022 252)" }}
          >
            <Table>
              <TableHeader>
                <TableRow
                  style={{
                    background: "oklch(0.19 0.020 255)",
                    borderColor: "oklch(0.28 0.022 252)",
                  }}
                >
                  {[
                    "Part Name",
                    "Specification",
                    "Qty",
                    "Min Level",
                    "Unit",
                    "Cost/Unit",
                    "Machine/Section",
                    "Status",
                    ...(isAdmin ? ["Actions"] : []),
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-xs font-semibold"
                      style={{ color: "oklch(0.68 0.010 260)" }}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 9 : 8}
                      className="text-center py-12"
                      data-ocid="spares.empty_state"
                      style={{ color: "oklch(0.55 0.010 260)" }}
                    >
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      {search
                        ? "No parts match your search"
                        : "No spare parts added yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item, idx) => {
                    const isLow = item.qtyInStock <= item.minStockLevel;
                    return (
                      <TableRow
                        key={item.id}
                        data-ocid={`spares.item.${idx + 1}`}
                        style={{
                          borderColor: "oklch(0.28 0.022 252)",
                          background:
                            idx % 2 === 0
                              ? "oklch(0.17 0.018 255)"
                              : "oklch(0.165 0.022 252)",
                        }}
                      >
                        <TableCell
                          className="font-medium text-sm"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          {item.partName}
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {item.partSpec || "-"}
                        </TableCell>
                        <TableCell
                          className="text-sm font-bold"
                          style={{
                            color: isLow
                              ? "oklch(0.78 0.17 27)"
                              : "oklch(0.88 0.010 260)",
                          }}
                        >
                          {item.qtyInStock}
                        </TableCell>
                        <TableCell
                          className="text-sm"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {item.minStockLevel}
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {item.unit}
                        </TableCell>
                        <TableCell
                          className="text-sm"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          ₹{item.costPerUnit.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className="text-xs"
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {item.applicableMachineSection || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            style={{
                              background: isLow
                                ? "oklch(0.45 0.18 27 / 0.2)"
                                : "oklch(0.45 0.12 145 / 0.2)",
                              color: isLow
                                ? "oklch(0.88 0.17 27)"
                                : "oklch(0.88 0.13 145)",
                              border: `1px solid ${isLow ? "oklch(0.55 0.17 27 / 0.4)" : "oklch(0.52 0.12 145 / 0.4)"}`,
                              fontWeight: 700,
                            }}
                          >
                            {isLow ? "Low Stock" : "OK"}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEdit(item)}
                                data-ocid={`spares.edit_button.${idx + 1}`}
                                style={{
                                  color: "oklch(0.68 0.010 260)",
                                  padding: "4px 8px",
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(item.id)}
                                data-ocid={`spares.delete_button.${idx + 1}`}
                                style={{
                                  color: "oklch(0.78 0.17 27)",
                                  padding: "4px 8px",
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </main>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent
            data-ocid="spares.dialog"
            style={{
              background: "oklch(0.19 0.020 255)",
              borderColor: "oklch(0.34 0.030 252)",
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: "oklch(0.88 0.010 260)" }}>
                {editId ? "Edit Spare" : "Add Spare"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Part Name *
                  </Label>
                  <Input
                    data-ocid="spares.input"
                    value={form.partName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, partName: e.target.value }))
                    }
                    style={inputStyle}
                    placeholder="e.g. V-Belt A60"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Specification
                  </Label>
                  <Input
                    data-ocid="spares.input"
                    value={form.partSpec}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, partSpec: e.target.value }))
                    }
                    style={inputStyle}
                    placeholder="e.g. A60 5L Standard"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Qty in Stock
                  </Label>
                  <Input
                    data-ocid="spares.input"
                    type="number"
                    value={form.qtyInStock}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        qtyInStock: Number(e.target.value),
                      }))
                    }
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Min Stock Level
                  </Label>
                  <Input
                    data-ocid="spares.input"
                    type="number"
                    value={form.minStockLevel}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        minStockLevel: Number(e.target.value),
                      }))
                    }
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Unit
                  </Label>
                  <Input
                    data-ocid="spares.input"
                    value={form.unit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unit: e.target.value }))
                    }
                    style={inputStyle}
                    placeholder="Nos / m / kg"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Cost per Unit (₹)
                  </Label>
                  <Input
                    data-ocid="spares.input"
                    type="number"
                    value={form.costPerUnit}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        costPerUnit: Number(e.target.value),
                      }))
                    }
                    style={inputStyle}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Applicable Machine / Section
                  </Label>
                  <Input
                    data-ocid="spares.input"
                    value={form.applicableMachineSection}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        applicableMachineSection: e.target.value,
                      }))
                    }
                    style={inputStyle}
                    placeholder="e.g. Powder Coating / CNC-01"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  data-ocid="spares.cancel_button"
                  style={{
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  data-ocid="spares.save_button"
                  style={{
                    background: "oklch(0.48 0.13 200 / 0.20)",
                    color: "oklch(0.70 0.14 200)",
                    border: "1px solid oklch(0.48 0.13 200 / 0.4)",
                  }}
                >
                  {editId ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <footer
          className="border-t py-4"
          style={{
            background: "oklch(0.19 0.020 255)",
            borderColor: "oklch(0.34 0.030 252)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-xs" style={{ color: "oklch(0.50 0.010 260)" }}>
              © {new Date().getFullYear()}. Built with ❤ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "oklch(0.70 0.188 55)" }}
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
