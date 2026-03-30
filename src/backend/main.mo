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
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

actor {
  // Include authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Include content storage
  include MixinStorage();

  type Machine = {
    id : Text;
    name : Text;
    department : Text;
    machineType : Text;
    location : Text;
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
    machineId : Text;
    month : Nat;
    frequency : Text;
    checklistTemplateId : Text;
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
  };

  public type UserProfile = {
    name : Text;
    role : Text; // "admin" or "operator"
  };

  // Internal storage
  let machines = Map.empty<Text, Machine>();
  let checklistTemplates = Map.empty<Text, ChecklistTemplate>();
  let pmPlans = Map.empty<Text, PMPlan>();
  let pmRecords = Map.empty<Text, PMRecord>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // User profile management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query func compareText(a : Text, b : Text) : async Order.Order {
    Text.compare(a, b);
  };

  // Admin CRUD for machines
  public shared ({ caller }) func addMachine(machine : Machine) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add machines");
    };
    machines.add(machine.id, machine);
  };

  public shared ({ caller }) func deleteMachine(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete machines");
    };
    if (not machines.containsKey(id)) { Runtime.trap("Machine does not exist.") };
    machines.remove(id);
  };

  public query ({ caller }) func getAllMachines() : async [Machine] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view machines");
    };
    machines.values().toArray();
  };

  // Admin CRUD for checklist templates
  public shared ({ caller }) func addChecklistTemplate(template : ChecklistTemplate) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add checklist templates");
    };
    checklistTemplates.add(template.id, template);
  };

  public query ({ caller }) func getChecklistTemplate(id : Text) : async ChecklistTemplate {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view checklist templates");
    };
    switch (checklistTemplates.get(id)) {
      case (null) { Runtime.trap("Checklist template does not exist.") };
      case (?template) { template };
    };
  };

  // Admin CRUD for PM plans
  public shared ({ caller }) func addPMPlan(plan : PMPlan) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add PM plans");
    };
    pmPlans.add(plan.machineId # "" # plan.month.toText(), plan);
  };

  // Submit PM checklist - operators (users) can submit
  public shared ({ caller }) func submitPMRecord(record : PMRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit PM records");
    };
    pmRecords.add(record.id, record);
  };

  // Get today's plan - operators (users) need to see their tasks
  public query ({ caller }) func getTodaysPlan(currentMonth : Nat) : async [PMPlan] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view PM plans");
    };
    let filtered = pmPlans.values().toArray().filter(
      func(p) { p.month == currentMonth }
    );
    filtered;
  };

  // Get all PM records - for export, admin only
  public query ({ caller }) func getAllPMRecords() : async [PMRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all PM records");
    };
    pmRecords.values().toArray();
  };
};
