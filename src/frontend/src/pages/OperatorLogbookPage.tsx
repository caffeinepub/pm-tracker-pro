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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, FileSpreadsheet, LogOut, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import MorningPopup from "../components/MorningPopup";
import NotificationBell from "../components/NotificationBell";
import type { LogbookCheckItem, LogbookEntry } from "../context/AppContext";
import { useApp } from "../context/AppContext";

const XLSX = (window as any).XLSX;

export default function OperatorLogbookPage() {
  const {
    user,
    logout,
    navigate,
    logbookCheckItems,
    logbookEntries,
    addLogbookCheckItem,
    updateLogbookCheckItem,
    deleteLogbookCheckItem,
    submitLogbookEntry,
  } = useApp();

  // Admin: manage check items
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ description: "", category: "" });
  const [editItemId, setEditItemId] = useState<string | null>(null);

  // Logbook entry form
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [entryItems, setEntryItems] = useState<
    Record<
      string,
      { status: "OK" | "Not OK" | "NA"; remark: string; photoDataUrl: string }
    >
  >({});
  const [generalRemarks, setGeneralRemarks] = useState("");

  // View entry dialog
  const [viewEntry, setViewEntry] = useState<LogbookEntry | null>(null);

  const sortedEntries = useMemo(() => {
    const entries =
      user?.role === "admin"
        ? logbookEntries
        : logbookEntries.filter((e) => e.operatorUsername === user?.username);
    return [...entries].sort((a, b) => b.date.localeCompare(a.date));
  }, [logbookEntries, user]);

  function getItemState(itemId: string) {
    return (
      entryItems[itemId] ?? {
        status: "NA" as const,
        remark: "",
        photoDataUrl: "",
      }
    );
  }

  function setItemState(
    itemId: string,
    updates: Partial<{
      status: "OK" | "Not OK" | "NA";
      remark: string;
      photoDataUrl: string;
    }>,
  ) {
    setEntryItems((prev) => ({
      ...prev,
      [itemId]: { ...getItemState(itemId), ...updates },
    }));
  }

  function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.description.trim()) {
      toast.error("Enter description");
      return;
    }
    if (editItemId) {
      updateLogbookCheckItem(editItemId, {
        description: itemForm.description,
        category: itemForm.category,
      });
      toast.success("Item updated");
    } else {
      const item: LogbookCheckItem = {
        id: `lb-item-${Date.now()}`,
        description: itemForm.description,
        category: itemForm.category,
        createdAt: Date.now(),
      };
      addLogbookCheckItem(item);
      toast.success("Item added");
    }
    setShowItemForm(false);
    setItemForm({ description: "", category: "" });
    setEditItemId(null);
  }

  function handleSubmitEntry(e: React.FormEvent) {
    e.preventDefault();
    if (logbookCheckItems.length === 0) {
      toast.error("Admin must add check items first");
      return;
    }
    const entry: LogbookEntry = {
      id: `lb-entry-${Date.now()}`,
      date: entryDate,
      operatorName: user?.name ?? "",
      operatorUsername: user?.username ?? "",
      items: logbookCheckItems.map((item) => {
        const state = getItemState(item.id);
        return {
          checkItemId: item.id,
          description: item.description,
          status: state.status,
          remark: state.remark,
          photoDataUrl: state.photoDataUrl || undefined,
        };
      }),
      generalRemarks,
      submittedAt: Date.now(),
    };
    submitLogbookEntry(entry);
    toast.success("Logbook entry submitted!");
    setEntryItems({});
    setGeneralRemarks("");
  }

  function handleExport() {
    if (!XLSX) {
      toast.error("XLSX not available");
      return;
    }
    const data = sortedEntries.flatMap((e) =>
      e.items.map((item) => ({
        Date: e.date,
        Operator: e.operatorName,
        Description: item.description,
        Status: item.status,
        Remark: item.remark,
        "General Remarks": e.generalRemarks,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Logbook");
    XLSX.writeFile(
      wb,
      `Operator_Logbook_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }

  const inputStyle = {
    background: "oklch(0.19 0.020 255)",
    borderColor: "oklch(0.34 0.030 252)",
    color: "oklch(0.88 0.010 260)",
  };
  const navItems = [
    { label: "Dashboard", page: "dashboard" as const },
    { label: "Preventive Maintenance", page: "preventive" as const },
    { label: "Breakdown", page: "breakdown-panel" as const },
    { label: "Analysis", page: "analysis" as const },
  ];

  return (
    <>
      <MorningPopup />
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "oklch(0.165 0.022 252)" }}
      >
        <header
          className="sticky top-0 z-50 border-b"
          style={{
            background: "oklch(0.19 0.020 255)",
            borderColor: "oklch(0.34 0.030 252)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "oklch(0.50 0.065 232 / 0.15)",
                  border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                }}
              >
                <BookOpen
                  className="w-4 h-4"
                  style={{ color: "oklch(0.65 0.150 232)" }}
                />
              </div>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Operator{" "}
                <span style={{ color: "oklch(0.65 0.150 232)" }}>Logbook</span>
              </span>
              <nav className="hidden md:flex items-center gap-1 ml-4">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    data-ocid="nav.link"
                    onClick={() => navigate(item.page)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/5"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button
                size="sm"
                onClick={handleExport}
                data-ocid="logbook.export.button"
                style={{
                  background: "oklch(0.30 0.060 145 / 0.25)",
                  color: "oklch(0.75 0.13 145)",
                  border: "1px solid oklch(0.52 0.12 145 / 0.4)",
                  fontSize: "12px",
                }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Export
              </Button>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                style={{
                  background: "oklch(0.40 0.150 25 / 0.15)",
                  color: "oklch(0.72 0.170 25)",
                  border: "1px solid oklch(0.55 0.150 25 / 0.3)",
                }}
                data-ocid="logbook.logout.button"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full pb-24 md:pb-8 space-y-6">
          {/* Admin: Checksheet Items */}
          {user?.role === "admin" && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="industrial-card p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-sm font-bold"
                  style={{
                    fontFamily: "BricolageGrotesque, sans-serif",
                    color: "oklch(0.88 0.010 260)",
                  }}
                >
                  Checksheet Items (Admin)
                </h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setItemForm({ description: "", category: "" });
                    setEditItemId(null);
                    setShowItemForm(true);
                  }}
                  data-ocid="logbook.open_modal_button"
                  style={{
                    background: "oklch(0.50 0.065 232 / 0.20)",
                    color: "oklch(0.65 0.150 232)",
                    border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                    fontSize: "12px",
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>
              {logbookCheckItems.length === 0 ? (
                <p
                  className="text-sm text-center py-4"
                  style={{ color: "oklch(0.55 0.010 260)" }}
                >
                  No checksheet items. Add items for operators to fill daily.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow
                        style={{ borderColor: "oklch(0.34 0.030 252)" }}
                      >
                        {["#", "Description", "Category", "Actions"].map(
                          (h) => (
                            <TableHead
                              key={h}
                              style={{ color: "oklch(0.68 0.010 260)" }}
                            >
                              {h}
                            </TableHead>
                          ),
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logbookCheckItems.map((item, idx) => (
                        <TableRow
                          key={item.id}
                          data-ocid={`logbook.row.${idx + 1}`}
                          style={{ borderColor: "oklch(0.28 0.025 252)" }}
                        >
                          <TableCell
                            className="text-xs"
                            style={{ color: "oklch(0.55 0.010 260)" }}
                          >
                            {idx + 1}
                          </TableCell>
                          <TableCell
                            className="text-sm"
                            style={{ color: "oklch(0.88 0.010 260)" }}
                          >
                            {item.description}
                          </TableCell>
                          <TableCell
                            className="text-xs"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {item.category}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setItemForm({
                                    description: item.description,
                                    category: item.category,
                                  });
                                  setEditItemId(item.id);
                                  setShowItemForm(true);
                                }}
                                data-ocid={`logbook.edit_button.${idx + 1}`}
                                style={{
                                  fontSize: "11px",
                                  borderColor: "oklch(0.34 0.030 252)",
                                  color: "oklch(0.68 0.010 260)",
                                  height: "26px",
                                  padding: "0 8px",
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => deleteLogbookCheckItem(item.id)}
                                data-ocid={`logbook.delete_button.${idx + 1}`}
                                style={{
                                  fontSize: "11px",
                                  background: "oklch(0.40 0.150 25 / 0.15)",
                                  color: "oklch(0.72 0.170 25)",
                                  border: "1px solid oklch(0.55 0.15 25 / 0.3)",
                                  height: "26px",
                                  padding: "0 8px",
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.section>
          )}

          {/* Daily Logbook Entry */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="industrial-card p-5"
          >
            <h3
              className="text-sm font-bold mb-4"
              style={{
                fontFamily: "BricolageGrotesque, sans-serif",
                color: "oklch(0.88 0.010 260)",
              }}
            >
              Daily Logbook Entry
            </h3>
            <form onSubmit={handleSubmitEntry} className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Date
                  </Label>
                  <Input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    data-ocid="logbook.input"
                    style={{ ...inputStyle }}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.010 260)" }}
                  >
                    Operator Name
                  </Label>
                  <Input
                    value={user?.name ?? ""}
                    readOnly
                    data-ocid="logbook.input"
                    style={{ ...inputStyle, opacity: 0.7 }}
                    className="w-44"
                  />
                </div>
              </div>

              {logbookCheckItems.length === 0 ? (
                <p
                  className="text-sm py-4"
                  style={{ color: "oklch(0.55 0.010 260)" }}
                >
                  No checksheet items defined. Admin must add items first.
                </p>
              ) : (
                <div className="space-y-3">
                  {logbookCheckItems.map((item) => {
                    const state = getItemState(item.id);
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg p-4"
                        style={{
                          background: "oklch(0.19 0.020 255)",
                          border: "1px solid oklch(0.28 0.025 252)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p
                              className="text-sm font-medium"
                              style={{ color: "oklch(0.88 0.010 260)" }}
                            >
                              {item.description}
                            </p>
                            {item.category && (
                              <p
                                className="text-xs"
                                style={{ color: "oklch(0.55 0.010 260)" }}
                              >
                                {item.category}
                              </p>
                            )}
                          </div>
                          <Select
                            value={state.status}
                            onValueChange={(v) =>
                              setItemState(item.id, {
                                status: v as "OK" | "Not OK" | "NA",
                              })
                            }
                          >
                            <SelectTrigger
                              className="w-24 h-8"
                              data-ocid="logbook.select"
                              style={{
                                background: "oklch(0.22 0.022 252)",
                                borderColor: "oklch(0.34 0.030 252)",
                                color:
                                  state.status === "OK"
                                    ? "oklch(0.75 0.13 145)"
                                    : state.status === "Not OK"
                                      ? "oklch(0.78 0.17 27)"
                                      : "oklch(0.68 0.010 260)",
                                fontSize: "12px",
                              }}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              style={{
                                background: "oklch(0.22 0.022 252)",
                                borderColor: "oklch(0.34 0.030 252)",
                              }}
                            >
                              <SelectItem
                                value="OK"
                                style={{ color: "oklch(0.75 0.13 145)" }}
                              >
                                OK
                              </SelectItem>
                              <SelectItem
                                value="Not OK"
                                style={{ color: "oklch(0.78 0.17 27)" }}
                              >
                                Not OK
                              </SelectItem>
                              <SelectItem
                                value="NA"
                                style={{ color: "oklch(0.68 0.010 260)" }}
                              >
                                N/A
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            value={state.remark}
                            onChange={(e) =>
                              setItemState(item.id, { remark: e.target.value })
                            }
                            placeholder="Remark (optional)"
                            data-ocid="logbook.input"
                            style={{ ...inputStyle, fontSize: "12px" }}
                          />
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) =>
                                  setItemState(item.id, {
                                    photoDataUrl:
                                      (ev.target?.result as string) ?? "",
                                  });
                                reader.readAsDataURL(file);
                              }}
                              className="text-xs block w-full"
                              style={{ color: "oklch(0.68 0.010 260)" }}
                              data-ocid="logbook.upload_button"
                            />
                            {state.photoDataUrl && (
                              <img
                                src={state.photoDataUrl}
                                alt=""
                                className="mt-1 rounded max-h-16 object-cover"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  General Remarks
                </Label>
                <Textarea
                  value={generalRemarks}
                  onChange={(e) => setGeneralRemarks(e.target.value)}
                  rows={2}
                  placeholder="Any additional remarks..."
                  data-ocid="logbook.textarea"
                  style={{ ...inputStyle }}
                />
              </div>
              <Button
                type="submit"
                data-ocid="logbook.submit_button"
                style={{
                  background: "oklch(0.50 0.065 232 / 0.20)",
                  color: "oklch(0.65 0.150 232)",
                  border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                }}
              >
                Submit Logbook Entry
              </Button>
            </form>
          </motion.section>

          {/* Logbook Records */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="industrial-card overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: "oklch(0.34 0.030 252)" }}
            >
              <h3
                className="text-sm font-bold"
                style={{ color: "oklch(0.88 0.010 260)" }}
              >
                Logbook Records
              </h3>
              <Badge
                style={{
                  background: "oklch(0.50 0.065 232 / 0.15)",
                  color: "oklch(0.65 0.150 232)",
                }}
              >
                {sortedEntries.length} entries
              </Badge>
            </div>
            {sortedEntries.length === 0 ? (
              <div data-ocid="logbook.empty_state" className="p-12 text-center">
                <BookOpen
                  className="w-10 h-10 mx-auto mb-3"
                  style={{ color: "oklch(0.45 0.010 260)" }}
                />
                <p style={{ color: "oklch(0.55 0.010 260)" }}>
                  No logbook entries yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderColor: "oklch(0.34 0.030 252)" }}>
                      {[
                        "Date",
                        "Operator",
                        "OK Items",
                        "General Remarks",
                        "Action",
                      ].map((h) => (
                        <TableHead
                          key={h}
                          style={{ color: "oklch(0.68 0.010 260)" }}
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEntries.map((entry, idx) => {
                      const okCount = entry.items.filter(
                        (i) => i.status === "OK",
                      ).length;
                      const total = entry.items.length;
                      return (
                        <TableRow
                          key={entry.id}
                          data-ocid={`logbook.row.${idx + 1}`}
                          style={{ borderColor: "oklch(0.28 0.025 252)" }}
                        >
                          <TableCell
                            className="text-xs font-semibold"
                            style={{ color: "oklch(0.80 0.180 55)" }}
                          >
                            {entry.date}
                          </TableCell>
                          <TableCell
                            className="text-xs"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {entry.operatorName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                background:
                                  okCount === total
                                    ? "oklch(0.30 0.090 145 / 0.25)"
                                    : "oklch(0.35 0.090 55 / 0.25)",
                                color:
                                  okCount === total
                                    ? "oklch(0.75 0.130 145)"
                                    : "oklch(0.80 0.180 55)",
                                fontWeight: "bold",
                                fontSize: "11px",
                              }}
                            >
                              {okCount}/{total}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="text-xs max-w-[160px] truncate"
                            style={{ color: "oklch(0.55 0.010 260)" }}
                          >
                            {entry.generalRemarks || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewEntry(entry)}
                              data-ocid={`logbook.edit_button.${idx + 1}`}
                              style={{
                                fontSize: "11px",
                                borderColor: "oklch(0.34 0.030 252)",
                                color: "oklch(0.68 0.010 260)",
                                height: "26px",
                                padding: "0 8px",
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.section>
        </main>

        {/* Add/Edit Item Dialog */}
        <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
          <DialogContent
            style={{
              background: "oklch(0.22 0.022 252)",
              border: "1px solid oklch(0.34 0.030 252)",
              color: "oklch(0.88 0.010 260)",
            }}
            data-ocid="logbook.dialog"
          >
            <DialogHeader>
              <DialogTitle style={{ color: "oklch(0.88 0.010 260)" }}>
                {editItemId ? "Edit" : "Add"} Checksheet Item
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveItem} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Description *
                </Label>
                <Input
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, description: e.target.value }))
                  }
                  data-ocid="logbook.input"
                  style={{ ...inputStyle }}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Category
                </Label>
                <Input
                  value={itemForm.category}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="e.g. Safety, Housekeeping, Machine Check"
                  data-ocid="logbook.input"
                  style={{ ...inputStyle }}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowItemForm(false)}
                  data-ocid="logbook.cancel_button"
                  style={{
                    borderColor: "oklch(0.34 0.030 252)",
                    color: "oklch(0.68 0.010 260)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-ocid="logbook.submit_button"
                  style={{
                    background: "oklch(0.50 0.065 232 / 0.20)",
                    color: "oklch(0.65 0.150 232)",
                    border: "1px solid oklch(0.50 0.065 232 / 0.4)",
                  }}
                >
                  Save
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Entry Dialog */}
        <Dialog
          open={!!viewEntry}
          onOpenChange={(o) => !o && setViewEntry(null)}
        >
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: "oklch(0.22 0.022 252)",
              border: "1px solid oklch(0.34 0.030 252)",
              color: "oklch(0.88 0.010 260)",
            }}
            data-ocid="logbook.dialog"
          >
            <DialogHeader>
              <DialogTitle style={{ color: "oklch(0.88 0.010 260)" }}>
                Logbook Entry — {viewEntry?.date}
              </DialogTitle>
            </DialogHeader>
            {viewEntry && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded p-2"
                    style={{ background: "oklch(0.19 0.020 255)" }}
                  >
                    <p
                      className="text-xs"
                      style={{ color: "oklch(0.55 0.010 260)" }}
                    >
                      Operator
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "oklch(0.88 0.010 260)" }}
                    >
                      {viewEntry.operatorName}
                    </p>
                  </div>
                  <div
                    className="rounded p-2"
                    style={{ background: "oklch(0.19 0.020 255)" }}
                  >
                    <p
                      className="text-xs"
                      style={{ color: "oklch(0.55 0.010 260)" }}
                    >
                      General Remarks
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "oklch(0.88 0.010 260)" }}
                    >
                      {viewEntry.generalRemarks || "-"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {viewEntry.items.map((item) => (
                    <div
                      key={item.checkItemId}
                      className="rounded p-3"
                      style={{
                        background: "oklch(0.19 0.020 255)",
                        border: "1px solid oklch(0.28 0.025 252)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p
                          className="text-sm"
                          style={{ color: "oklch(0.88 0.010 260)" }}
                        >
                          {item.description}
                        </p>
                        <Badge
                          style={{
                            background:
                              item.status === "OK"
                                ? "oklch(0.30 0.090 145 / 0.25)"
                                : item.status === "Not OK"
                                  ? "oklch(0.35 0.120 27 / 0.25)"
                                  : "oklch(0.28 0.025 252)",
                            color:
                              item.status === "OK"
                                ? "oklch(0.75 0.130 145)"
                                : item.status === "Not OK"
                                  ? "oklch(0.78 0.17 27)"
                                  : "oklch(0.68 0.010 260)",
                            fontWeight: "bold",
                            fontSize: "11px",
                          }}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      {item.remark && (
                        <p
                          className="text-xs"
                          style={{ color: "oklch(0.55 0.010 260)" }}
                        >
                          Remark: {item.remark}
                        </p>
                      )}
                      {item.photoDataUrl && (
                        <img
                          src={item.photoDataUrl}
                          alt=""
                          className="mt-2 rounded max-h-24 object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
