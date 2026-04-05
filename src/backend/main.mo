import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Bool "mo:core/Bool";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Option "mo:core/Option";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // ─── Old types (for upgrade compatibility — previous canister had these) ──────
  // These are kept only so the compiler can read the old stable memory.
  // They are immediately discarded during migration below.

  type OldMachine = {
    id : Text;
    name : Text;
    department : Text;
    machineType : Text;
    location : Text;
  };

  type OldPMPlan = {
    machineId : Text;
    month : Nat;
    frequency : Text;
    checklistTemplateId : Text;
  };

  type OldChecklistResult = {
    itemId : Text;
    value : Text;
    remark : Text;
    photoFilename : Text;
  };

  type OldPMRecord = {
    id : Text;
    machineId : Text;
    operatorId : Text;
    operatorName : Text;
    completedDate : Int;
    checklistResults : [OldChecklistResult];
    status : Text;
  };

  // ─── Current types ────────────────────────────────────────────────────────────

  public type UserProfile = {
    name : Text;
    role : Text;
  };

  type UserRecord = {
    username : Text;
    passwordHash : Text;
    name : Text;
    role : Text;
  };

  type Machine = {
    id : Text;
    name : Text;
    department : Text;
    machineType : Text;
    location : Text;
    section : Text;
    availableWorkingHours : Float;
  };

  type ChecklistItem = {
    id : Text;
    description : Text;
    itemType : Text;
  };

  type ChecklistTemplate = {
    id : Text;
    machineType : Text;
    items : [ChecklistItem];
  };

  type PMPlan = {
    id : Text;
    machineId : Text;
    month : Nat;
    frequency : Text;
    checklistTemplateId : Text;
    scheduledDate : Text;
    notes : Text;
  };

  type SpareUsed = {
    spareName : Text;
    partSpec : Text;
    qty : Float;
    unit : Text;
    cost : Float;
  };

  type ChecklistResult = {
    itemId : Text;
    value : Text;
    remark : Text;
    photoFilename : Text;
  };

  type PMRecord = {
    id : Text;
    machineId : Text;
    operatorId : Text;
    operatorName : Text;
    completedDate : Int;
    checklistResults : [ChecklistResult];
    status : Text;
    spareUsed : [SpareUsed];
    submittedAt : Int;
  };

  type BreakdownRecord = {
    id : Text;
    machineId : Text;
    machineName : Text;
    date : Text;
    startTime : Text;
    endTime : Text;
    durationMinutes : Float;
    problemDescription : Text;
    faultType : Text;
    affectedPart : Text;
    temporaryAction : Text;
    breakdownType : Text;
    operatorName : Text;
    operatorUsername : Text;
    status : Text;
    isInCapa : Bool;
    isInHistory : Bool;
    adminRemarks : Text;
    submittedAt : Int;
    photoFilename : Text;
    spareUsed : [SpareUsed];
  };

  type CAPARecord = {
    id : Text;
    breakdownId : Text;
    machineId : Text;
    machineName : Text;
    date : Text;
    problemSummary : Text;
    rootCause : Text;
    temporaryAction : Text;
    permanentAction : Text;
    responsiblePerson : Text;
    targetDate : Text;
    status : Text;
    createdAt : Int;
    closedAt : Int;
  };

  type HistoryCardEntry = {
    id : Text;
    machineId : Text;
    machineName : Text;
    date : Text;
    eventType : Text;
    durationMinutes : Float;
    problemDescription : Text;
    actionTaken : Text;
    doneBy : Text;
    remarks : Text;
    sourceId : Text;
    createdAt : Int;
  };

  type SectionHoursConfig = {
    section : Text;
    availableProductionHrs : Float;
    powerOff : Float;
  };

  type SectionTargets = {
    bdPct : Float;
    mttr : Float;
    mtbf : Float;
    uptime : Float;
  };

  type TaskStatusHistoryItem = {
    status : Text;
    changedBy : Text;
    remark : Text;
    photoFilename : Text;
    timestamp : Int;
    requiresApproval : Bool;
    approved : Bool;
  };

  type TaskRecord = {
    id : Text;
    title : Text;
    description : Text;
    priority : Text;
    status : Text;
    assignedTo : Text;
    assignedByUsername : Text;
    createdAt : Int;
    dueDate : Text;
    statusHistory : [TaskStatusHistoryItem];
    lastUpdatedRemark : Text;
    lastUpdatedPhoto : Text;
  };

  type KaizenSpareItem = {
    name : Text;
    partNo : Text;
    qty : Text;
    unit : Text;
  };

  type KaizenRecord = {
    id : Text;
    title : Text;
    category : Text;
    machineArea : Text;
    problemDescription : Text;
    improvementDescription : Text;
    beforePhotoFilename : Text;
    afterPhotoFilename : Text;
    submittedBy : Text;
    submittedByUsername : Text;
    submittedAt : Int;
    status : Text;
    closedAt : Int;
    closedRemarks : Text;
    spares : [KaizenSpareItem];
    approvedAt : Int;
    rejectedAt : Int;
    rejectionReason : Text;
    adminRemarks : Text;
  };

  type PredictivePlan = {
    id : Text;
    machineId : Text;
    machineName : Text;
    scheduledDate : Text;
    frequency : Text;
    parameters : [Text];
    notes : Text;
    createdAt : Int;
  };

  type PredictiveReading = {
    paramName : Text;
    value : Text;
  };

  type PredictiveRecord = {
    id : Text;
    planId : Text;
    machineId : Text;
    machineName : Text;
    date : Text;
    readings : [PredictiveReading];
    remarks : Text;
    operatorName : Text;
    operatorUsername : Text;
    submittedAt : Int;
    status : Text;
  };

  type ElectricityMeter = {
    id : Text;
    name : Text;
    unit : Text;
    multiplier : Float;
    location : Text;
    includeInKpi : Bool;
    createdAt : Int;
  };

  type MeterReading = {
    id : Text;
    meterId : Text;
    meterName : Text;
    date : Text;
    time : Text;
    reading : Float;
    consumption : Float;
    enteredBy : Text;
    enteredByUsername : Text;
    submittedAt : Int;
  };

  type LogbookCheckItem = {
    id : Text;
    description : Text;
    category : Text;
    createdAt : Int;
  };

  type LogbookItemEntry = {
    checkItemId : Text;
    description : Text;
    status : Text;
    remark : Text;
    photoFilename : Text;
  };

  type LogbookActivity = {
    description : Text;
    timeSpent : Text;
    status : Text;
    remarks : Text;
    photoFilename : Text;
  };

  type LogbookSpareUsed = {
    spareName : Text;
    qty : Float;
    cost : Float;
  };

  type LogbookEntry = {
    id : Text;
    date : Text;
    operatorName : Text;
    operatorUsername : Text;
    items : [LogbookItemEntry];
    generalRemarks : Text;
    submittedAt : Int;
    activities : [LogbookActivity];
    spareUsed : [LogbookSpareUsed];
  };

  type SpareItem = {
    id : Text;
    partName : Text;
    partSpec : Text;
    qtyInStock : Float;
    minStockLevel : Float;
    unit : Text;
    costPerUnit : Float;
    applicableMachineSection : Text;
    createdAt : Int;
  };

  type PMSpareUsage = {
    id : Text;
    machineId : Text;
    machineName : Text;
    date : Text;
    spareUsed : [SpareUsed];
    submittedBy : Text;
    submittedByUsername : Text;
    workType : Text;
    submittedAt : Int;
  };

  type AppNotification = {
    id : Text;
    message : Text;
    timestamp : Int;
    read : Bool;
    targetUsername : Text;
  };

  // ─── Legacy stable vars (old types) — read on upgrade, then ignored ───────────
  // These must match the previous canister's stable variable names and types
  // exactly so Motoko can deserialise them on upgrade.

  let machines : Map.Map<Text, OldMachine> = Map.empty();
  let pmPlans : Map.Map<Text, OldPMPlan> = Map.empty();
  let pmRecords : Map.Map<Text, OldPMRecord> = Map.empty();

  // ─── New stable storage (renamed to avoid conflict) ───────────────────────────

  let userRecords = Map.empty<Text, UserRecord>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let machinesV2 = Map.empty<Text, Machine>();
  let prioritizedMachineIds = Map.empty<Text, Bool>();
  let checklistTemplates = Map.empty<Text, ChecklistTemplate>();
  let pmPlansV2 = Map.empty<Text, PMPlan>();
  let pmRecordsV2 = Map.empty<Text, PMRecord>();
  let breakdownRecords = Map.empty<Text, BreakdownRecord>();
  let capaRecords = Map.empty<Text, CAPARecord>();
  let historyEntries = Map.empty<Text, HistoryCardEntry>();
  let sectionHoursConfigs = Map.empty<Text, SectionHoursConfig>();
  let bdTargets = Map.empty<Text, SectionTargets>();
  let taskRecords = Map.empty<Text, TaskRecord>();
  let kaizenRecords = Map.empty<Text, KaizenRecord>();
  let predictivePlans = Map.empty<Text, PredictivePlan>();
  let predictiveRecords = Map.empty<Text, PredictiveRecord>();
  let electricityMeters = Map.empty<Text, ElectricityMeter>();
  let meterReadings = Map.empty<Text, MeterReading>();
  let logbookCheckItems = Map.empty<Text, LogbookCheckItem>();
  let logbookEntries = Map.empty<Text, LogbookEntry>();
  let spareItems = Map.empty<Text, SpareItem>();
  let pmSpareUsage = Map.empty<Text, PMSpareUsage>();
  let notifications = Map.empty<Text, AppNotification>();

  // ─── User Profile (ICP principal-based) ──────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func isCallerAdminCheck() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // ─── Username/Password User Management ───────────────────────────────────────


  // Setup initial admin — only works when no users exist yet
  public shared func setupInitialAdmin(username : Text, passwordHash : Text, name : Text) : async Bool {
    if (userRecords.size() > 0) { return false };
    userRecords.add(username, { username; passwordHash; name; role = "admin" });
    true;
  };

  // Returns number of registered users (used by login page for first-run detection)
  public query func getUserCount() : async Nat {
    userRecords.size();
  };

  public shared ({ caller }) func createUser(username : Text, passwordHash : Text, name : Text, role : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create users");
    };
    if (userRecords.containsKey(username)) { return false };
    userRecords.add(username, { username; passwordHash; name; role });
    true;
  };

  public shared ({ caller }) func updateUser(username : Text, passwordHash : Text, name : Text, role : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update users");
    };
    if (not userRecords.containsKey(username)) { return false };
    userRecords.add(username, { username; passwordHash; name; role });
    true;
  };

  public shared ({ caller }) func deleteUser(username : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete users");
    };
    if (not userRecords.containsKey(username)) { return false };
    userRecords.remove(username);
    true;
  };

  public query ({ caller }) func getAllUserRecords() : async [UserRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can list users");
    };
    userRecords.values().toArray();
  };

  public query func loginUser(username : Text, passwordHash : Text) : async ?UserRecord {
    switch (userRecords.get(username)) {
      case (null) { null };
      case (?u) {
        if (u.passwordHash == passwordHash) { ?u } else { null };
      };
    };
  };

  // ─── Machines ─────────────────────────────────────────────────────────────────

  public shared ({ caller }) func saveMachine(machine : Machine) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    machinesV2.add(machine.id, machine);
  };

  public shared ({ caller }) func deleteMachine(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    machinesV2.remove(id);
  };

  public query ({ caller }) func getAllMachines() : async [Machine] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    machinesV2.values().toArray();
  };

  public shared ({ caller }) func setPrioritizedMachines(ids : [Text]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    for (key in prioritizedMachineIds.keys().toArray().vals()) {
      prioritizedMachineIds.remove(key);
    };
    for (id in ids.vals()) {
      prioritizedMachineIds.add(id, true);
    };
  };

  public query ({ caller }) func getPrioritizedMachines() : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    prioritizedMachineIds.keys().toArray();
  };

  // ─── Checklist Templates ──────────────────────────────────────────────────────

  public shared ({ caller }) func saveChecklistTemplate(template : ChecklistTemplate) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    checklistTemplates.add(template.id, template);
  };

  public shared ({ caller }) func deleteChecklistTemplate(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    checklistTemplates.remove(id);
  };

  public query ({ caller }) func getAllChecklistTemplates() : async [ChecklistTemplate] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    checklistTemplates.values().toArray();
  };

  // ─── PM Plans ─────────────────────────────────────────────────────────────────

  public shared ({ caller }) func savePMPlan(plan : PMPlan) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    pmPlansV2.add(plan.id, plan);
  };

  public shared ({ caller }) func deletePMPlan(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    pmPlansV2.remove(id);
  };

  public query ({ caller }) func getAllPMPlans() : async [PMPlan] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    pmPlansV2.values().toArray();
  };

  // ─── PM Records ───────────────────────────────────────────────────────────────

  public shared ({ caller }) func savePMRecord(record : PMRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    pmRecordsV2.add(record.id, record);
  };

  public shared ({ caller }) func deletePMRecord(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    pmRecordsV2.remove(id);
  };

  public query ({ caller }) func getAllPMRecords() : async [PMRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    pmRecordsV2.values().toArray();
  };

  // ─── Breakdown Records ────────────────────────────────────────────────────────

  public shared ({ caller }) func saveBreakdownRecord(record : BreakdownRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    breakdownRecords.add(record.id, record);
  };

  public shared ({ caller }) func deleteBreakdownRecord(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    breakdownRecords.remove(id);
  };

  public query ({ caller }) func getAllBreakdownRecords() : async [BreakdownRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    breakdownRecords.values().toArray();
  };

  // ─── CAPA Records ─────────────────────────────────────────────────────────────

  public shared ({ caller }) func saveCAPARecord(record : CAPARecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    capaRecords.add(record.id, record);
  };

  public shared ({ caller }) func deleteCAPARecord(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    capaRecords.remove(id);
  };

  public query ({ caller }) func getAllCAPARecords() : async [CAPARecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    capaRecords.values().toArray();
  };

  // ─── History Card Entries ─────────────────────────────────────────────────────

  public shared ({ caller }) func saveHistoryEntry(entry : HistoryCardEntry) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    historyEntries.add(entry.id, entry);
  };

  public shared ({ caller }) func deleteHistoryEntry(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    historyEntries.remove(id);
  };

  public query ({ caller }) func getAllHistoryEntries() : async [HistoryCardEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    historyEntries.values().toArray();
  };

  // ─── Section Hours Config ─────────────────────────────────────────────────────

  public shared ({ caller }) func saveSectionHoursConfig(config : SectionHoursConfig) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    sectionHoursConfigs.add(config.section, config);
  };

  public query ({ caller }) func getAllSectionHoursConfigs() : async [SectionHoursConfig] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    sectionHoursConfigs.values().toArray();
  };

  // ─── BD Targets ───────────────────────────────────────────────────────────────

  public shared ({ caller }) func saveBDTarget(section : Text, targets : SectionTargets) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    bdTargets.add(section, targets);
  };

  public query ({ caller }) func getAllBDTargets() : async [(Text, SectionTargets)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    bdTargets.entries().toArray();
  };

  // ─── Task Records ─────────────────────────────────────────────────────────────

  public shared ({ caller }) func saveTaskRecord(record : TaskRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    taskRecords.add(record.id, record);
  };

  public shared ({ caller }) func deleteTaskRecord(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    taskRecords.remove(id);
  };

  public query ({ caller }) func getAllTaskRecords() : async [TaskRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    taskRecords.values().toArray();
  };

  // ─── Kaizen Records ───────────────────────────────────────────────────────────

  public shared ({ caller }) func saveKaizenRecord(record : KaizenRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    kaizenRecords.add(record.id, record);
  };

  public shared ({ caller }) func deleteKaizenRecord(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    kaizenRecords.remove(id);
  };

  public query ({ caller }) func getAllKaizenRecords() : async [KaizenRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    kaizenRecords.values().toArray();
  };

  // ─── Predictive Plans ─────────────────────────────────────────────────────────

  public shared ({ caller }) func savePredictivePlan(plan : PredictivePlan) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    predictivePlans.add(plan.id, plan);
  };

  public shared ({ caller }) func deletePredictivePlan(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    predictivePlans.remove(id);
  };

  public query ({ caller }) func getAllPredictivePlans() : async [PredictivePlan] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    predictivePlans.values().toArray();
  };

  // ─── Predictive Records ───────────────────────────────────────────────────────

  public shared ({ caller }) func savePredictiveRecord(record : PredictiveRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    predictiveRecords.add(record.id, record);
  };

  public shared ({ caller }) func deletePredictiveRecord(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    predictiveRecords.remove(id);
  };

  public query ({ caller }) func getAllPredictiveRecords() : async [PredictiveRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    predictiveRecords.values().toArray();
  };

  // ─── Electricity Meters ───────────────────────────────────────────────────────

  public shared ({ caller }) func saveElectricityMeter(meter : ElectricityMeter) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    electricityMeters.add(meter.id, meter);
  };

  public shared ({ caller }) func deleteElectricityMeter(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    electricityMeters.remove(id);
  };

  public query ({ caller }) func getAllElectricityMeters() : async [ElectricityMeter] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    electricityMeters.values().toArray();
  };

  // ─── Meter Readings ───────────────────────────────────────────────────────────

  public shared ({ caller }) func saveMeterReading(reading : MeterReading) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    meterReadings.add(reading.id, reading);
  };

  public shared ({ caller }) func deleteMeterReading(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    meterReadings.remove(id);
  };

  public query ({ caller }) func getAllMeterReadings() : async [MeterReading] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    meterReadings.values().toArray();
  };

  // ─── Logbook Check Items ──────────────────────────────────────────────────────

  public shared ({ caller }) func saveLogbookCheckItem(item : LogbookCheckItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    logbookCheckItems.add(item.id, item);
  };

  public shared ({ caller }) func deleteLogbookCheckItem(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    logbookCheckItems.remove(id);
  };

  public query ({ caller }) func getAllLogbookCheckItems() : async [LogbookCheckItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    logbookCheckItems.values().toArray();
  };

  // ─── Logbook Entries ──────────────────────────────────────────────────────────

  public shared ({ caller }) func saveLogbookEntry(entry : LogbookEntry) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    logbookEntries.add(entry.id, entry);
  };

  public shared ({ caller }) func deleteLogbookEntry(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    logbookEntries.remove(id);
  };

  public query ({ caller }) func getAllLogbookEntries() : async [LogbookEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    logbookEntries.values().toArray();
  };

  // ─── Spare Items ──────────────────────────────────────────────────────────────

  public shared ({ caller }) func saveSpareItem(item : SpareItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    spareItems.add(item.id, item);
  };

  public shared ({ caller }) func deleteSpareItem(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    spareItems.remove(id);
  };

  public query ({ caller }) func getAllSpareItems() : async [SpareItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    spareItems.values().toArray();
  };

  // ─── PM Spare Usage ───────────────────────────────────────────────────────────

  public shared ({ caller }) func savePMSpareUsage(record : PMSpareUsage) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    pmSpareUsage.add(record.id, record);
  };

  public shared ({ caller }) func deletePMSpareUsage(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    pmSpareUsage.remove(id);
  };

  public query ({ caller }) func getAllPMSpareUsage() : async [PMSpareUsage] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    pmSpareUsage.values().toArray();
  };

  // ─── Notifications ────────────────────────────────────────────────────────────

  public shared ({ caller }) func saveNotification(notif : AppNotification) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    notifications.add(notif.id, notif);
  };

  public shared ({ caller }) func markNotificationRead(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (notifications.get(id)) {
      case (null) {};
      case (?n) {
        notifications.add(id, { n with read = true });
      };
    };
  };

  public query ({ caller }) func getAllNotifications() : async [AppNotification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    notifications.values().toArray();
  };

  // ─── Utility ──────────────────────────────────────────────────────────────────

  public query func compareText(a : Text, b : Text) : async Order.Order {
    Text.compare(a, b);
  };

  // ─── Admin: Clear All Data ────────────────────────────────────────────────────

  public shared ({ caller }) func clearAllData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can clear all data");
    };
    for (k in breakdownRecords.keys().toArray().vals()) { breakdownRecords.remove(k) };
    for (k in capaRecords.keys().toArray().vals()) { capaRecords.remove(k) };
    for (k in historyEntries.keys().toArray().vals()) { historyEntries.remove(k) };
    for (k in taskRecords.keys().toArray().vals()) { taskRecords.remove(k) };
    for (k in kaizenRecords.keys().toArray().vals()) { kaizenRecords.remove(k) };
    for (k in predictivePlans.keys().toArray().vals()) { predictivePlans.remove(k) };
    for (k in predictiveRecords.keys().toArray().vals()) { predictiveRecords.remove(k) };
    for (k in electricityMeters.keys().toArray().vals()) { electricityMeters.remove(k) };
    for (k in meterReadings.keys().toArray().vals()) { meterReadings.remove(k) };
    for (k in logbookCheckItems.keys().toArray().vals()) { logbookCheckItems.remove(k) };
    for (k in logbookEntries.keys().toArray().vals()) { logbookEntries.remove(k) };
    for (k in spareItems.keys().toArray().vals()) { spareItems.remove(k) };
    for (k in pmSpareUsage.keys().toArray().vals()) { pmSpareUsage.remove(k) };
    for (k in notifications.keys().toArray().vals()) { notifications.remove(k) };
    for (k in pmRecordsV2.keys().toArray().vals()) { pmRecordsV2.remove(k) };
    for (k in pmPlansV2.keys().toArray().vals()) { pmPlansV2.remove(k) };
    for (k in machinesV2.keys().toArray().vals()) { machinesV2.remove(k) };
    for (k in checklistTemplates.keys().toArray().vals()) { checklistTemplates.remove(k) };
  };
};
