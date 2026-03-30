import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const STORAGE = {
  session: "pm_session_v4",
  masters: "pm_masters_v4",
  records: "pm_records_v4",
};

const DEFAULT_USERS = [
  { username: "admin", password: "admin123", name: "Admin", role: "Admin" },
  { username: "tech1", password: "123", name: "Technician 1", role: "Operator" },
  { username: "tech2", password: "123", name: "Technician 2", role: "Operator" },
  { username: "tech3", password: "123", name: "Technician 3", role: "Operator" },
  { username: "tech4", password: "123", name: "Technician 4", role: "Operator" },
];

const SAMPLE_MASTERS = {
  machineMaster: [
    { "Machine ID": "M-001", "Machine Name": "Press-01", "Machine Type": "Press machines" },
    { "Machine ID": "M-002", "Machine Name": "Oven-01", "Machine Type": "Oven" },
    { "Machine ID": "M-003", "Machine Name": "Compressor-01", "Machine Type": "Compressor" },
  ],
  pmPlan: [
    { "Machine ID": "M-001", Date: new Date().toISOString().slice(0, 10) },
    { "Machine ID": "M-002", Date: new Date().toISOString().slice(0, 10) },
    { "Machine ID": "M-003", Date: new Date().toISOString().slice(0, 10) },
  ],
  checklistMaster: [
    { "Machine Type": "Press machines", "Check Point": "Lubrication" },
    { "Machine Type": "Press machines", "Check Point": "Safety guard" },
    { "Machine Type": "Oven", "Check Point": "Temperature check" },
    { "Machine Type": "Compressor", "Check Point": "Pressure check" },
  ],
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function niceNumber(n) {
  return Number.isFinite(n) ? n : 0;
}

function Pill({ tone = "slate", children }) {
  const styles = {
    slate: { bg: "#e2e8f0", fg: "#334155" },
    blue: { bg: "#dbeafe", fg: "#1d4ed8" },
    green: { bg: "#dcfce7", fg: "#166534" },
    amber: { bg: "#fef3c7", fg: "#92400e" },
    red: { bg: "#fee2e2", fg: "#991b1b" },
    purple: { bg: "#ede9fe", fg: "#6d28d9" },
  };
  const c = styles[tone] || styles.slate;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 10px", background: c.bg, color: c.fg, fontSize: 12, fontWeight: 800, border: "1px solid rgba(148,163,184,.35)" }}>
      {children}
    </span>
  );
}

function StatCard({ title, value, hint, accent = "#0f172a" }) {
  return (
    <div style={{
      background: "linear-gradient(180deg, #ffffff, #f8fafc)",
      borderRadius: 26,
      border: "1px solid #e2e8f0",
      boxShadow: "0 10px 30px rgba(15,23,42,.06)",
      padding: 20,
      minWidth: 180,
      flex: 1,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: "auto -20px -20px auto", width: 110, height: 110, borderRadius: "50%", background: accent, opacity: 0.08 }} />
      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 34, lineHeight: 1, marginTop: 10, fontWeight: 900, color: "#0f172a" }}>{value}</div>
      <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>{hint}</div>
    </div>
  );
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900, color: "#0f172a" }}>{title}</h2>
        {subtitle ? <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>{subtitle}</div> : null}
      </div>
      {action}
    </div>
  );
}

function Button({ children, onClick, variant = "dark", type = "button" }) {
  const base = {
    border: "none",
    borderRadius: 16,
    padding: "11px 14px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    transition: "transform .15s ease, opacity .15s ease",
  };
  const variants = {
    dark: { background: "#0f172a", color: "white" },
    light: { background: "white", color: "#0f172a", border: "1px solid #cbd5e1" },
    blue: { background: "#2563eb", color: "white" },
    green: { background: "#16a34a", color: "white" },
    amber: { background: "#f59e0b", color: "white" },
  };
  return <button type={type} onClick={onClick} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

function Graph({ labels, planned, actual }) {
  const width = 800;
  const height = 260;
  const pad = 26;
  const max = Math.max(1, ...planned, ...actual);
  const innerH = height - pad * 2;
  const groupW = (width - pad * 2) / labels.length;
  const barW = Math.min(22, groupW / 3);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="plannedG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="actualG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} rx="22" fill="#ffffff" />
      {Array.from({ length: 5 }).map((_, i) => {
        const y = pad + (innerH / 4) * i;
        return <line key={i} x1={pad} y1={y} x2={width - pad} y2={y} stroke="#e2e8f0" />;
      })}
      {labels.map((lab, i) => {
        const plannedH = (planned[i] / max) * innerH;
        const actualH = (actual[i] / max) * innerH;
        const x = pad + i * groupW + groupW * 0.18;
        return (
          <g key={lab}>
            <rect x={x} y={height - pad - plannedH} width={barW} height={plannedH} rx="8" fill="url(#plannedG)" />
            <rect x={x + barW + 10} y={height - pad - actualH} width={barW} height={actualH} rx="8" fill="url(#actualG)" />
            <text x={x - 2} y={height - 7} fontSize="10" fill="#64748b">{lab}</text>
          </g>
        );
      })}
      <rect x={26} y={8} width={12} height={12} rx={3} fill="#2563eb" />
      <text x={44} y={18} fontSize="12" fill="#475569">Planned</text>
      <rect x={100} y={8} width={12} height={12} rx={3} fill="#16a34a" />
      <text x={118} y={18} fontSize="12" fill="#475569">Actual</text>
    </svg>
  );
}

export default function App() {
  const [users] = useState(DEFAULT_USERS);
  const [session, setSession] = useState(() => loadJSON(STORAGE.session, null));
  const [masters, setMasters] = useState(() => loadJSON(STORAGE.masters, SAMPLE_MASTERS));
  const [records, setRecords] = useState(() => loadJSON(STORAGE.records, []));
  const [page, setPage] = useState(session ? "dashboard" : "login");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [draft, setDraft] = useState({});
  const [toast, setToast] = useState("");
  const [importFileName, setImportFileName] = useState("");

  useEffect(() => saveJSON(STORAGE.session, session), [session]);
  useEffect(() => saveJSON(STORAGE.masters, masters), [masters]);
  useEffect(() => saveJSON(STORAGE.records, records), [records]);

  const machineMaster = masters.machineMaster || [];
  const pmPlan = masters.pmPlan || [];
  const checklistMaster = masters.checklistMaster || [];

  const todayPlan = useMemo(() => {
    const day = selectedDate;
    const map = new Map();
    pmPlan.filter((p) => String(p.Date || "").slice(0, 10) === day).forEach((p) => {
      const mid = String(p["Machine ID"] || "").trim();
      const machine = machineMaster.find((m) => String(m["Machine ID"] || "") === mid);
      if (machine) map.set(mid, machine);
    });
    return Array.from(map.values());
  }, [pmPlan, machineMaster, selectedDate]);

  const todayRecords = useMemo(() => records.filter((r) => r.date === selectedDate), [records, selectedDate]);
  const completedIds = useMemo(() => new Set(todayRecords.map((r) => r.machineId)), [todayRecords]);
  const plannedCount = todayPlan.length;
  const completedCount = completedIds.size;
  const pendingCount = Math.max(0, plannedCount - completedCount);
  const compliance = plannedCount ? Math.round((completedCount / plannedCount) * 100) : 0;

  const graphLabels = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d.toISOString().slice(5, 10));
    }
    return arr;
  }, []);

  const graphData = useMemo(() => {
    const planned = graphLabels.map((lab) => pmPlan.filter((p) => String(p.Date || "").slice(5, 10) === lab).length);
    const actual = graphLabels.map((lab) => records.filter((r) => r.date.slice(5, 10) === lab).reduce((n) => n + 1, 0));
    return { planned, actual };
  }, [graphLabels, pmPlan, records]);

  function toastMsg(msg) {
    setToast(msg);
    window.clearTimeout(window.__pmToast);
    window.__pmToast = window.setTimeout(() => setToast(""), 2500);
  }

  function login(e) {
    e.preventDefault();
    const u = loginForm.username.trim();
    const p = loginForm.password;
    const found = users.find((x) => x.username === u && x.password === p);
    if (!found) return toastMsg("Invalid username or password");
    setSession(found);
    setPage("dashboard");
    toastMsg(`Welcome ${found.name}`);
  }

  function logout() {
    setSession(null);
    setPage("login");
    setSelectedMachine(null);
  }

  function parseExcel(file) {
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const machineSheet = wb.Sheets["Machine_Master"];
        const planSheet = wb.Sheets["PM_Plan"];
        const checklistSheet = wb.Sheets["PM_Checklist_Master"];

        if (!machineSheet || !planSheet || !checklistSheet) {
          toastMsg("Missing one or more required sheets");
          return;
        }

        const machineData = XLSX.utils.sheet_to_json(machineSheet, { defval: "" }).map((r) => ({
          "Machine ID": String(r["Machine ID"] || r["MachineID"] || r["ID"] || "").trim(),
          "Machine Name": String(r["Machine Name"] || r["Machine"] || r["Name"] || "").trim(),
          "Machine Type": String(r["Machine Type"] || r["Type"] || "").trim(),
        })).filter((r) => r["Machine ID"] && r["Machine Name"]);

        const planData = XLSX.utils.sheet_to_json(planSheet, { defval: "" }).map((r) => ({
          "Machine ID": String(r["Machine ID"] || r["MachineID"] || r["ID"] || "").trim(),
          Date: String(r["Date"] || r["PM Date"] || "").slice(0, 10),
        })).filter((r) => r["Machine ID"] && r.Date);

        const checklistData = XLSX.utils.sheet_to_json(checklistSheet, { defval: "" }).map((r) => ({
          "Machine Type": String(r["Machine Type"] || r["Type"] || "").trim(),
          "Check Point": String(r["Check Point"] || r["Checkpoint"] || r["Point"] || "").trim(),
        })).filter((r) => r["Machine Type"] && r["Check Point"]);

        setMasters({ machineMaster: machineData, pmPlan: planData, checklistMaster: checklistData });
        toastMsg("Excel imported successfully");
      } catch (err) {
        console.error(err);
        toastMsg("Excel import failed");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const sheets = {
      Machine_Master: machineMaster,
      PM_Plan: pmPlan,
      PM_Checklist_Master: checklistMaster,
      PM_Records: records,
    };
    Object.entries(sheets).forEach(([name, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    });
    XLSX.writeFile(wb, `PM_Report_${todayISO()}.xlsx`);
    toastMsg("Excel exported");
  }

  function openMachine(machine) {
    setSelectedMachine(machine);
    const type = machine["Machine Type"];
    const points = checklistMaster.filter((c) => c["Machine Type"] === type);
    const initial = {};
    points.forEach((p) => {
      initial[p["Check Point"]] = { result: "OK", remark: "", photoName: "" };
    });
    setDraft(initial);
    setPage("checksheet");
  }

  function submitChecklist() {
    if (!selectedMachine) return;
    const type = selectedMachine["Machine Type"];
    const points = checklistMaster.filter((c) => c["Machine Type"] === type);
    const rows = points.map((p) => {
      const value = draft[p["Check Point"]] || { result: "OK", remark: "", photoName: "" };
      return {
        id: uid(),
        date: selectedDate,
        machineId: selectedMachine["Machine ID"],
        machineName: selectedMachine["Machine Name"],
        machineType: type,
        checkpoint: p["Check Point"],
        result: value.result,
        remark: value.remark,
        photoName: value.photoName,
        doneBy: session?.name || session?.username || "Unknown",
      };
    });
    setRecords((prev) => [...rows, ...prev]);
    toastMsg(`Saved ${rows.length} checklist rows`);
    setSelectedMachine(null);
    setPage("dashboard");
  }

  const adminMode = session?.role === "Admin";

  if (page === "login") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, #1e293b 0%, #0f172a 55%, #020617 100%)",
        fontFamily: "Arial, sans-serif",
        padding: 18,
      }}>
        <div style={{ width: "100%", maxWidth: 430, background: "rgba(255,255,255,.95)", backdropFilter: "blur(10px)", borderRadius: 30, padding: 28, boxShadow: "0 30px 80px rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.4)" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg,#2563eb,#22c55e)", boxShadow: "0 12px 30px rgba(37,99,235,.35)" }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>Maintenance App</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>Login to PM dashboard</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            <Pill tone="blue">Mobile Ready</Pill>
            <Pill tone="green">Plan vs Actual</Pill>
            <Pill tone="purple">Excel Master</Pill>
          </div>
          <form onSubmit={login} style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, fontWeight: 700 }}>Username</div>
              <input value={loginForm.username} onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value }))} placeholder="admin" style={{ width: "100%", padding: "13px 14px", borderRadius: 16, border: "1px solid #cbd5e1", outline: "none", fontSize: 14 }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, fontWeight: 700 }}>Password</div>
              <input type="password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} placeholder="admin123" style={{ width: "100%", padding: "13px 14px", borderRadius: 16, border: "1px solid #cbd5e1", outline: "none", fontSize: 14 }} />
            </div>
            <Button type="submit" variant="blue">Login</Button>
          </form>
          <div style={{ marginTop: 16, color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>
            Demo users: admin/admin123, tech1/123, tech2/123, tech3/123, tech4/123
          </div>
          {toast ? <div style={{ marginTop: 14, background: "#0f172a", color: "white", padding: 12, borderRadius: 14 }}>{toast}</div> : null}
        </div>
      </div>
    );
  }

  if (page === "checksheet" && selectedMachine) {
    const type = selectedMachine["Machine Type"];
    const points = checklistMaster.filter((c) => c["Machine Type"] === type);

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 16, fontFamily: "Arial, sans-serif" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ background: "white", borderRadius: 28, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.06)", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{selectedMachine["Machine Name"]}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Checklist screen · {type}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill tone="blue">Operator: {session?.name || session?.username}</Pill>
              <Pill tone="green">Photo upload</Pill>
              <Button variant="light" onClick={() => { setPage("dashboard"); setSelectedMachine(null); }}>Back to Dashboard</Button>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 28, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.06)" }}>
            <SectionTitle title="Machine Check Sheet" subtitle="Update result, remarks and upload photo for each checkpoint" />
            <div style={{ display: "grid", gap: 12 }}>
              {points.length ? points.map((p) => {
                const cp = p["Check Point"];
                const current = draft[cp] || { result: "OK", remark: "", photoName: "" };
                return (
                  <div key={cp} style={{ border: "1px solid #e2e8f0", borderRadius: 22, padding: 14, background: "linear-gradient(180deg,#fff,#f8fafc)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 900, color: "#0f172a" }}>{cp}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Status and evidence required</div>
                      </div>
                      <select value={current.result} onChange={(e) => setDraft((prev) => ({ ...prev, [cp]: { ...current, result: e.target.value } }))} style={{ padding: "11px 12px", borderRadius: 14, border: "1px solid #cbd5e1", minWidth: 120 }}>
                        <option>OK</option>
                        <option>Not OK</option>
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                      <input value={current.remark} onChange={(e) => setDraft((prev) => ({ ...prev, [cp]: { ...current, remark: e.target.value } }))} placeholder="Remark" style={{ padding: "12px 13px", borderRadius: 14, border: "1px solid #cbd5e1" }} />
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        setDraft((prev) => ({ ...prev, [cp]: { ...current, photoName: file ? file.name : "" } }));
                      }} style={{ padding: 10, borderRadius: 14, border: "1px dashed #cbd5e1", background: "#fff" }} />
                    </div>
                    {current.photoName ? <div style={{ marginTop: 8, fontSize: 12, color: "#475569" }}>Selected photo: {current.photoName}</div> : null}
                  </div>
                );
              }) : <div style={{ color: "#64748b", padding: 12 }}>No checklist rows found in master for this machine type.</div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <Button variant="light" onClick={() => { setPage("dashboard"); setSelectedMachine(null); }}>Cancel</Button>
                <Button variant="green" onClick={submitChecklist}>Submit PM</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const adminPanel = (
    <div style={{ background: "white", borderRadius: 28, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.06)" }}>
      <SectionTitle title="Admin Master Upload" subtitle="Upload Excel with Machine_Master, PM_Plan, PM_Checklist_Master sheets" />
      <div style={{ display: "grid", gap: 10 }}>
        <input type="file" accept=".xlsx,.xls" onChange={(e) => parseExcel(e.target.files?.[0])} style={{ padding: 12, borderRadius: 14, border: "1px dashed #cbd5e1", background: "#f8fafc" }} />
        <div style={{ color: "#64748b", fontSize: 13 }}>Current file: {importFileName || "No file uploaded"}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Pill tone="blue">Machines: {machineMaster.length}</Pill>
          <Pill tone="green">Plan rows: {pmPlan.length}</Pill>
          <Pill tone="purple">Checklist rows: {checklistMaster.length}</Pill>
          <Button variant="light" onClick={exportExcel}>Export Excel</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f8fafc,#eef2ff 45%,#f8fafc)", fontFamily: "Arial, sans-serif", padding: 16 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b 55%,#0b1220)", color: "white", borderRadius: 30, padding: 22, boxShadow: "0 20px 60px rgba(15,23,42,.25)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 58, height: 58, borderRadius: 18, background: "linear-gradient(135deg,#2563eb,#22c55e)", boxShadow: "0 12px 30px rgba(34,197,94,.22)" }} />
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>Factory Maintenance Dashboard</div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>Plan vs Actual · Today PM · Excel Master · Industrial look</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill tone="blue">User: {session?.name}</Pill>
              <Pill tone="green">PM % {compliance}%</Pill>
              <Pill tone="amber">Pending {pendingCount}</Pill>
              <Button variant="light" onClick={logout}>Logout</Button>
            </div>
          </div>
        </div>

        {toast ? <div style={{ marginBottom: 12, background: "#0f172a", color: "white", padding: 12, borderRadius: 14, boxShadow: "0 8px 20px rgba(0,0,0,.12)" }}>{toast}</div> : null}

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard title="Today's Planned" value={plannedCount} hint="Machines from yearly plan" accent="#2563eb" />
            <StatCard title="Completed" value={completedCount} hint="Machines already reported" accent="#16a34a" />
            <StatCard title="Pending" value={pendingCount} hint="Waiting for PM" accent="#f59e0b" />
            <StatCard title="PM %" value={`${compliance}%`} hint="Plan vs actual compliance" accent="#8b5cf6" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.45fr .95fr", gap: 16 }}>
            <div style={{ background: "white", borderRadius: 28, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.06)" }}>
              <SectionTitle title="Plan vs Actual Graph" subtitle="Last 7 days performance view" />
              <Graph labels={graphLabels} planned={graphData.planned} actual={graphData.actual} />
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ background: "white", borderRadius: 28, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.06)" }}>
                <SectionTitle title="Today’s Plan" subtitle="Click a machine to open its checklist" />
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 14, border: "1px solid #cbd5e1", marginBottom: 12 }} />
                <div style={{ display: "grid", gap: 10, maxHeight: 320, overflow: "auto" }}>
                  {todayPlan.length ? todayPlan.map((m) => {
                    const done = completedIds.has(m["Machine ID"]);
                    return (
                      <button key={m["Machine ID"]} onClick={() => openMachine(m)} style={{ textAlign: "left", padding: 14, borderRadius: 18, border: "1px solid #e2e8f0", background: done ? "linear-gradient(180deg,#ecfdf5,#f0fdf4)" : "linear-gradient(180deg,#fff,#f8fafc)", cursor: "pointer", boxShadow: "0 8px 18px rgba(15,23,42,.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 900, color: "#0f172a" }}>{m["Machine Name"]}</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{m["Machine Type"]}</div>
                          </div>
                          <Pill tone={done ? "green" : "amber"}>{done ? "Done" : "Pending"}</Pill>
                        </div>
                      </button>
                    );
                  }) : <div style={{ color: "#64748b" }}>No plan loaded for selected date.</div>}
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 28, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.06)" }}>
                <SectionTitle title="System Status" subtitle="Tracking and export summary" />
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ padding: 14, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Logged in as</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{session?.name}</div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Today</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{selectedDate}</div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Records saved</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{records.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: adminMode ? "1fr 1fr" : "1fr", gap: 16 }}>
            <div style={{ background: "white", borderRadius: 28, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.06)" }}>
              <SectionTitle title="Today's PM Plan Machine List" subtitle="Press machine name to open separate checklist screen" />
              <div style={{ display: "grid", gap: 10 }}>
                {todayPlan.length ? todayPlan.map((m) => {
                  const done = completedIds.has(m["Machine ID"]);
                  return (
                    <button key={m["Machine ID"]} onClick={() => openMachine(m)} style={{ textAlign: "left", padding: 15, borderRadius: 18, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", boxShadow: "0 8px 18px rgba(15,23,42,.04)" }}>
                      <div>
                        <div style={{ fontWeight: 900, color: "#0f172a" }}>{m["Machine Name"]}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{m["Machine Type"]}</div>
                      </div>
                      <Pill tone={done ? "green" : "blue"}>{done ? "Completed" : "Open"}</Pill>
                    </button>
                  );
                }) : <div style={{ color: "#64748b" }}>No PM plan for this day.</div>}
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 28, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.06)" }}>
              <SectionTitle title="Recent PM Activity" subtitle="Who did PM and when" action={<Button variant="light" onClick={exportExcel}>Export Excel</Button>} />
              <div style={{ display: "grid", gap: 10, maxHeight: 380, overflow: "auto" }}>
                {todayRecords.slice(0, 12).map((r) => (
                  <div key={r.id} style={{ padding: 14, borderRadius: 18, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 900, color: "#0f172a" }}>{r.machineName}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{r.checkpoint}</div>
                      </div>
                      <Pill tone={r.result === "OK" ? "green" : "red"}>{r.result}</Pill>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
                      <span>{r.doneBy}</span>
                      <span>{r.photoName || "No photo"}</span>
                    </div>
                  </div>
                ))}
                {!todayRecords.length ? <div style={{ color: "#64748b" }}>No PM entries yet for this date.</div> : null}
              </div>
            </div>
          </div>

          {adminMode ? adminPanel : null}
        </div>
      </div>
    </div>
  );
}
