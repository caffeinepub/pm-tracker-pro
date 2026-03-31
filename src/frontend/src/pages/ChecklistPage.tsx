import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Send,
  Settings,
  Tag,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ChecklistResult } from "../backend";
import { useApp } from "../context/AppContext";

type ItemStatus = "ok" | "notok" | "";

interface ChecklistItemState {
  status: ItemStatus;
  remark: string;
  photoFilename: string;
}

export default function ChecklistPage() {
  const {
    user,
    machines,
    getTemplateForMachine,
    submitRecord,
    navigate,
    navParams,
    isMachineCompleted,
    pmRecords,
    spareItems,
    addPMSpareUsage,
  } = useApp();

  const machine = useMemo(
    () => machines.find((m) => m.id === navParams.machineId),
    [machines, navParams.machineId],
  );

  const template = useMemo(
    () => (machine ? getTemplateForMachine(machine) : undefined),
    [machine, getTemplateForMachine],
  );

  const [itemStates, setItemStates] = useState<
    Record<string, ChecklistItemState>
  >(() => {
    const init: Record<string, ChecklistItemState> = {};
    for (const item of template?.items ?? []) {
      init[item.id] = { status: "", remark: "", photoFilename: "" };
    }
    return init;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spareRows, setSpareRows] = useState<
    Array<{
      spareName: string;
      partSpec: string;
      qty: number;
      unit: string;
      cost: number;
    }>
  >([]);
  const [submitted, setSubmitted] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  if (!machine || !template) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.165 0.022 252)" }}
      >
        <div className="text-center">
          <AlertTriangle
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "oklch(0.80 0.180 55)" }}
          />
          <p className="text-lg font-semibold">Machine not found</p>
          <Button className="mt-4" onClick={() => navigate("dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Compute today's record status
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRecord = pmRecords.find(
    (r) =>
      r.machineId === machine.id &&
      Number(r.completedDate) >= todayStart.getTime(),
  );
  const isPendingApproval =
    !resubmitting && todayRecord?.status === "pending-approval";
  const isRejected =
    !submitted && !resubmitting && todayRecord?.status === "rejected";

  const setStatus = (itemId: string, status: ItemStatus) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], status },
    }));
  };

  const setRemark = (itemId: string, remark: string) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], remark },
    }));
  };

  const setPhoto = (itemId: string, filename: string) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], photoFilename: filename },
    }));
  };

  const allItemsAnswered = template.items.every(
    (item) => itemStates[item.id]?.status !== "",
  );

  const _hasIssues = template.items.some(
    (item) => itemStates[item.id]?.status === "notok",
  );

  const handleSubmit = async () => {
    if (!allItemsAnswered) {
      toast.error("Please complete all checklist items before submitting.");
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));

    const results: ChecklistResult[] = template.items.map((item) => ({
      itemId: item.id,
      value: itemStates[item.id]?.status ?? "",
      remark: itemStates[item.id]?.remark ?? "",
      photoFilename: itemStates[item.id]?.photoFilename ?? "",
    }));

    submitRecord({
      id: `rec-${Date.now()}`,
      machineId: machine.id,
      operatorName: user?.name ?? "Unknown",
      operatorId: user?.username ?? "unknown",
      status: "pending-approval",
      completedDate: BigInt(Date.now()),
      checklistResults: results,
    });

    if (spareRows.length > 0) {
      addPMSpareUsage({
        id: `pm-spare-${Date.now()}`,
        machineId: machine.id,
        machineName: machine.name,
        date: new Date().toISOString().split("T")[0],
        spareUsed: spareRows,
        submittedBy: user?.name ?? "",
        submittedByUsername: user?.username ?? "",
        workType: "PM",
      });
    }
    setSpareRows([]);
    setIsSubmitting(false);
    setSubmitted(true);
    setResubmitting(false);
    toast.success("Checklist submitted! Waiting for Admin Approval.");
  };

  const completedAlready = isMachineCompleted(machine.id);
  const completedCount = template.items.filter(
    (i) => itemStates[i.id]?.status !== "",
  ).length;
  const progressPct = Math.round(
    (completedCount / template.items.length) * 100,
  );

  // Show the checklist form when: not pending approval AND not submitted AND not already completed
  const showChecklistForm =
    !isPendingApproval && !submitted && !completedAlready;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.165 0.022 252)" }}
    >
      {/* Sticky Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "oklch(0.19 0.020 255)",
          borderColor: "oklch(0.34 0.030 252)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            data-ocid="checklist.close_button"
            onClick={() => navigate("dashboard")}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "oklch(0.68 0.010 260)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "oklch(0.70 0.188 55 / 0.15)",
                border: "1px solid oklch(0.70 0.188 55 / 0.4)",
              }}
            >
              <Settings
                className="w-3.5 h-3.5"
                style={{ color: "oklch(0.80 0.180 55)" }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {machine.name}
              </div>
              <div
                className="text-xs"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                PM Checklist · {template.items.length} items
              </div>
            </div>
          </div>
          {/* Progress indicator */}
          <div className="hidden sm:flex items-center gap-2">
            <div
              className="w-28 h-1.5 rounded-full overflow-hidden"
              style={{ background: "oklch(0.28 0.026 252)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: "oklch(0.70 0.188 55)" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.80 0.180 55)" }}
            >
              {progressPct}%
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-5 w-full pb-20 md:pb-0">
        {/* Machine Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="industrial-card p-4 mb-5"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wider mb-1"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Machine ID
              </p>
              <p
                className="text-sm font-semibold"
                style={{ color: "oklch(0.80 0.180 55)" }}
              >
                {machine.id}
              </p>
            </div>
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                <Building2 className="w-3 h-3" /> Dept
              </p>
              <p className="text-sm font-semibold">{machine.department}</p>
            </div>
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                <MapPin className="w-3 h-3" /> Location
              </p>
              <p className="text-sm font-semibold">{machine.location}</p>
            </div>
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                <Tag className="w-3 h-3" /> Type
              </p>
              <p className="text-sm font-semibold">{machine.machineType}</p>
            </div>
          </div>
          <div
            className="mt-3 pt-3 flex items-center justify-between"
            style={{ borderTop: "1px solid oklch(0.34 0.030 252)" }}
          >
            <div className="text-xs" style={{ color: "oklch(0.68 0.010 260)" }}>
              Operator:{" "}
              <span
                className="font-semibold"
                style={{ color: "oklch(0.96 0.004 260)" }}
              >
                {user?.name}
              </span>
            </div>
            <div className="text-xs" style={{ color: "oklch(0.68 0.010 260)" }}>
              Date:{" "}
              <span
                className="font-semibold"
                style={{ color: "oklch(0.96 0.004 260)" }}
              >
                {new Date().toLocaleDateString("en-IN")}
              </span>
            </div>
            {completedAlready && (
              <span className="status-completed text-xs font-semibold px-2 py-0.5 rounded-full">
                Already Completed
              </span>
            )}
            {isPendingApproval && !completedAlready && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.70 0.15 60 / 0.18)",
                  color: "oklch(0.82 0.16 60)",
                  border: "1px solid oklch(0.70 0.15 60 / 0.4)",
                }}
              >
                Waiting Approval
              </span>
            )}
          </div>
        </motion.div>

        {/* Waiting for Approval state (submitted this session OR already pending) */}
        <AnimatePresence>
          {(submitted || isPendingApproval) && (
            <motion.div
              data-ocid="checklist.success_state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="industrial-card p-8 text-center mb-5"
              style={{ border: "1px solid oklch(0.70 0.188 55 / 0.4)" }}
            >
              <Clock
                className="w-14 h-14 mx-auto mb-3"
                style={{ color: "oklch(0.80 0.160 55)" }}
              />
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "BricolageGrotesque, sans-serif" }}
              >
                Waiting for Approval
              </h2>
              <p
                className="text-sm mb-4"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Checklist for <strong>{machine.name}</strong> has been submitted
                and is awaiting Admin Approval.
              </p>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-5"
                style={{
                  background: "oklch(0.70 0.188 55 / 0.12)",
                  border: "1px solid oklch(0.70 0.188 55 / 0.35)",
                }}
              >
                <Clock
                  className="w-4 h-4"
                  style={{ color: "oklch(0.80 0.180 55)" }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: "oklch(0.80 0.180 55)" }}
                >
                  Pending Admin Review
                </span>
              </div>
              <Button
                data-ocid="checklist.primary_button"
                onClick={() => navigate("dashboard")}
                style={{
                  background: "oklch(0.70 0.188 55)",
                  color: "oklch(0.10 0.010 55)",
                }}
              >
                Back to Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rejected state — show banner + checklist for resubmission */}
        <AnimatePresence>
          {isRejected && (
            <motion.div
              data-ocid="checklist.error_state"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="industrial-card p-5 mb-5"
              style={{
                border: "1px solid oklch(0.52 0.170 27 / 0.6)",
                background: "oklch(0.45 0.18 27 / 0.08)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "oklch(0.45 0.18 27 / 0.25)" }}
                >
                  <AlertTriangle
                    className="w-5 h-5"
                    style={{ color: "oklch(0.75 0.17 27)" }}
                  />
                </div>
                <div className="flex-1">
                  <h3
                    className="text-base font-bold mb-1"
                    style={{ color: "oklch(0.82 0.15 27)" }}
                  >
                    Submission Rejected
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(0.68 0.010 260)" }}
                  >
                    Admin has rejected your PM record for{" "}
                    <strong style={{ color: "oklch(0.82 0.15 27)" }}>
                      {machine.name}
                    </strong>
                    . Please review and resubmit.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  data-ocid="checklist.primary_button"
                  onClick={() => setResubmitting(true)}
                  style={{
                    background: "oklch(0.55 0.17 27)",
                    color: "oklch(0.98 0.005 260)",
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resubmit Checklist
                </Button>
                <Button
                  data-ocid="checklist.cancel_button"
                  variant="outline"
                  onClick={() => navigate("dashboard")}
                >
                  Back to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Read-only submitted checklist for already completed machines */}
        {completedAlready && todayRecord && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
            data-ocid="checklist.panel"
          >
            <div
              className="rounded-xl p-5"
              style={{
                background: "oklch(0.19 0.020 255)",
                border: "1px solid oklch(0.34 0.030 252)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-sm font-bold"
                  style={{
                    fontFamily: "BricolageGrotesque, sans-serif",
                    color: "oklch(0.90 0.010 260)",
                  }}
                >
                  Submitted Checklist
                </h3>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: "oklch(0.55 0.16 145 / 0.18)",
                    color: "oklch(0.80 0.14 145)",
                    border: "1px solid oklch(0.55 0.16 145 / 0.4)",
                  }}
                >
                  ✓ Completed
                </span>
              </div>
              <div
                className="flex gap-4 mb-4 text-xs"
                style={{ color: "oklch(0.62 0.010 260)" }}
              >
                <span>
                  Operator:{" "}
                  <strong style={{ color: "oklch(0.82 0.010 260)" }}>
                    {todayRecord.operatorName || "—"}
                  </strong>
                </span>
                <span>
                  Date:{" "}
                  <strong style={{ color: "oklch(0.82 0.010 260)" }}>
                    {new Date(
                      Number(todayRecord.completedDate),
                    ).toLocaleDateString("en-IN")}
                  </strong>
                </span>
              </div>
              <div className="space-y-2">
                {template.items.map((item, idx) => {
                  const result = todayRecord.checklistResults?.find(
                    (r) => r.itemId === item.id,
                  );
                  const statusVal = result?.value ?? "";
                  const statusColor =
                    statusVal === "ok"
                      ? {
                          bg: "oklch(0.55 0.16 145 / 0.12)",
                          text: "oklch(0.78 0.14 145)",
                          border: "oklch(0.55 0.16 145 / 0.35)",
                        }
                      : statusVal === "notok"
                        ? {
                            bg: "oklch(0.55 0.17 27 / 0.12)",
                            text: "oklch(0.82 0.15 27)",
                            border: "oklch(0.52 0.17 27 / 0.3)",
                          }
                        : {
                            bg: "oklch(0.45 0.08 260 / 0.12)",
                            text: "oklch(0.68 0.010 260)",
                            border: "oklch(0.40 0.020 260 / 0.3)",
                          };
                  const statusLabel =
                    statusVal === "ok"
                      ? "OK"
                      : statusVal === "notok"
                        ? "NOT OK"
                        : "N/A";
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{
                        background: "oklch(0.22 0.018 255)",
                        border: "1px solid oklch(0.30 0.020 252)",
                      }}
                    >
                      <span
                        className="text-xs font-bold shrink-0 mt-0.5"
                        style={{ color: "oklch(0.62 0.010 260)" }}
                      >
                        {idx + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs mb-1"
                          style={{ color: "oklch(0.85 0.010 260)" }}
                        >
                          {item.description}
                        </p>
                        {result?.remark && (
                          <p
                            className="text-xs italic"
                            style={{ color: "oklch(0.62 0.010 260)" }}
                          >
                            Remark: {result.remark}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
                        style={{
                          background: statusColor.bg,
                          color: statusColor.text,
                          border: `1px solid ${statusColor.border}`,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Checklist Items */}
        {showChecklistForm && (
          <div className="space-y-3" data-ocid="checklist.panel">
            {isRejected && (
              <div
                className="px-3 py-2 rounded-lg text-xs font-medium mb-2"
                style={{
                  background: "oklch(0.55 0.17 27 / 0.12)",
                  color: "oklch(0.82 0.15 27)",
                  border: "1px solid oklch(0.52 0.17 27 / 0.3)",
                }}
              >
                ⚠ Update items below and resubmit for approval.
              </div>
            )}
            <h2
              className="text-sm font-semibold uppercase tracking-widest mb-3"
              style={{ color: "oklch(0.68 0.010 260)" }}
            >
              Checklist Items ({template.items.length})
            </h2>
            {template.items.map((item, idx) => {
              const state = itemStates[item.id] ?? {
                status: "",
                remark: "",
                photoFilename: "",
              };
              return (
                <motion.div
                  key={item.id}
                  data-ocid={`checklist.item.${idx + 1}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="industrial-card p-4"
                  style={{
                    borderColor:
                      state.status === "ok"
                        ? "oklch(0.52 0.120 145 / 0.5)"
                        : state.status === "notok"
                          ? "oklch(0.52 0.170 27 / 0.5)"
                          : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{
                        background:
                          state.status === "ok"
                            ? "oklch(0.45 0.120 145 / 0.3)"
                            : state.status === "notok"
                              ? "oklch(0.45 0.180 27 / 0.3)"
                              : "oklch(0.34 0.034 253)",
                        color:
                          state.status === "ok"
                            ? "oklch(0.75 0.130 145)"
                            : state.status === "notok"
                              ? "oklch(0.75 0.170 27)"
                              : "oklch(0.68 0.010 260)",
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-sm font-medium">
                            {item.description}
                          </p>
                          <p
                            className="text-xs mt-0.5 capitalize"
                            style={{ color: "oklch(0.68 0.010 260)" }}
                          >
                            {item.itemType}
                          </p>
                        </div>
                      </div>

                      {/* OK / NOT OK Buttons */}
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          data-ocid={`checklist.toggle.${idx + 1}`}
                          onClick={() => setStatus(item.id, "ok")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                          style={{
                            background:
                              state.status === "ok"
                                ? "oklch(0.45 0.120 145 / 0.3)"
                                : "oklch(0.26 0.024 253)",
                            border: `1px solid ${
                              state.status === "ok"
                                ? "oklch(0.52 0.120 145 / 0.6)"
                                : "oklch(0.34 0.030 252)"
                            }`,
                            color:
                              state.status === "ok"
                                ? "oklch(0.75 0.130 145)"
                                : "oklch(0.68 0.010 260)",
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          OK
                        </button>
                        <button
                          type="button"
                          data-ocid={`checklist.toggle.${idx + 1}`}
                          onClick={() => setStatus(item.id, "notok")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                          style={{
                            background:
                              state.status === "notok"
                                ? "oklch(0.45 0.180 27 / 0.3)"
                                : "oklch(0.26 0.024 253)",
                            border: `1px solid ${
                              state.status === "notok"
                                ? "oklch(0.52 0.170 27 / 0.6)"
                                : "oklch(0.34 0.030 252)"
                            }`,
                            color:
                              state.status === "notok"
                                ? "oklch(0.75 0.170 27)"
                                : "oklch(0.68 0.010 260)",
                          }}
                        >
                          <XCircle className="w-4 h-4" />
                          NOT OK
                        </button>
                      </div>

                      {/* Remark */}
                      <Textarea
                        data-ocid={`checklist.textarea.${idx + 1}`}
                        placeholder="Remark / observation (optional)"
                        value={state.remark}
                        onChange={(e) => setRemark(item.id, e.target.value)}
                        className="text-sm resize-none h-16"
                        style={{
                          background: "oklch(0.20 0.022 252)",
                          borderColor: "oklch(0.34 0.030 252)",
                        }}
                      />

                      {/* Photo Upload */}
                      <div className="mt-2">
                        <label
                          className="flex items-center gap-2 cursor-pointer text-xs font-medium px-3 py-2 rounded-lg w-fit transition-all hover:bg-white/5"
                          style={{
                            border: "1px dashed oklch(0.34 0.030 252)",
                            color: "oklch(0.68 0.010 260)",
                          }}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {state.photoFilename ? (
                            <span style={{ color: "oklch(0.75 0.130 145)" }}>
                              📎 {state.photoFilename}
                            </span>
                          ) : (
                            "Attach Photo"
                          )}
                          <input
                            data-ocid={`checklist.upload_button.${idx + 1}`}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setPhoto(item.id, file.name);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Spares Used */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="pt-1 pb-2"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.65 0.010 260)" }}
                >
                  Spares Used (Optional)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSpareRows((prev) => [
                      ...prev,
                      {
                        spareName: "",
                        partSpec: "",
                        qty: 1,
                        unit: "Nos",
                        cost: 0,
                      },
                    ])
                  }
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: "oklch(0.48 0.13 200 / 0.15)",
                    color: "oklch(0.70 0.14 200)",
                    border: "1px solid oklch(0.48 0.13 200 / 0.35)",
                  }}
                >
                  + Add Spare
                </button>
              </div>
              {spareRows.map((row, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: user-added spare row
                  key={i}
                  className="grid grid-cols-12 gap-1 mb-1 items-center"
                >
                  <div className="col-span-4">
                    <input
                      list={`spare-names-cl-${i}`}
                      value={row.spareName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const found = spareItems.find(
                          (s) => s.partName === val,
                        );
                        setSpareRows((prev) =>
                          prev.map((r, j) =>
                            j === i
                              ? {
                                  ...r,
                                  spareName: val,
                                  partSpec: found?.partSpec ?? r.partSpec,
                                  unit: found?.unit ?? r.unit,
                                  cost: found
                                    ? found.costPerUnit * r.qty
                                    : r.cost,
                                }
                              : r,
                          ),
                        );
                      }}
                      placeholder="Part name"
                      className="w-full px-2 py-1 text-xs rounded border"
                      style={{
                        background: "oklch(0.17 0.018 255)",
                        borderColor: "oklch(0.28 0.025 252)",
                        color: "oklch(0.88 0.010 260)",
                      }}
                    />
                    <datalist id={`spare-names-cl-${i}`}>
                      {spareItems.map((s) => (
                        <option key={s.id} value={s.partName} />
                      ))}
                    </datalist>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0}
                      value={row.qty}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        const found = spareItems.find(
                          (s) => s.partName === row.spareName,
                        );
                        setSpareRows((prev) =>
                          prev.map((r, j) =>
                            j === i
                              ? {
                                  ...r,
                                  qty,
                                  cost: found
                                    ? found.costPerUnit * qty
                                    : r.cost,
                                }
                              : r,
                          ),
                        );
                      }}
                      placeholder="Qty"
                      className="w-full px-2 py-1 text-xs rounded border"
                      style={{
                        background: "oklch(0.17 0.018 255)",
                        borderColor: "oklch(0.28 0.025 252)",
                        color: "oklch(0.88 0.010 260)",
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      value={row.unit}
                      onChange={(e) =>
                        setSpareRows((prev) =>
                          prev.map((r, j) =>
                            j === i ? { ...r, unit: e.target.value } : r,
                          ),
                        )
                      }
                      placeholder="Unit"
                      className="w-full px-2 py-1 text-xs rounded border"
                      style={{
                        background: "oklch(0.17 0.018 255)",
                        borderColor: "oklch(0.28 0.025 252)",
                        color: "oklch(0.88 0.010 260)",
                      }}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min={0}
                      value={row.cost}
                      onChange={(e) =>
                        setSpareRows((prev) =>
                          prev.map((r, j) =>
                            j === i
                              ? { ...r, cost: Number(e.target.value) }
                              : r,
                          ),
                        )
                      }
                      placeholder="Cost ₹"
                      className="w-full px-2 py-1 text-xs rounded border"
                      style={{
                        background: "oklch(0.17 0.018 255)",
                        borderColor: "oklch(0.28 0.025 252)",
                        color: "oklch(0.88 0.010 260)",
                      }}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setSpareRows((prev) => prev.filter((_, j) => j !== i))
                      }
                      style={{ color: "oklch(0.78 0.17 27)" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-3 pb-6"
            >
              {!allItemsAnswered && (
                <p
                  className="text-xs mb-3 text-center"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  {template.items.length - completedCount} item(s) remaining
                </p>
              )}
              <Button
                data-ocid="checklist.submit_button"
                className="w-full h-12 text-base font-semibold"
                onClick={handleSubmit}
                disabled={isSubmitting || !allItemsAnswered}
                style={{
                  background: allItemsAnswered
                    ? "oklch(0.70 0.188 55)"
                    : "oklch(0.28 0.026 252)",
                  color: allItemsAnswered
                    ? "oklch(0.10 0.010 55)"
                    : "oklch(0.50 0.010 260)",
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    {resubmitting
                      ? "Resubmit PM Checklist"
                      : "Submit PM Checklist"}
                  </span>
                )}
              </Button>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
