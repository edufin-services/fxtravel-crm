import "server-only";
import { Channel, Stage } from "./constants";
import { dbConnect } from "./mongoose";
import {
  AdminSettingsModel,
  BranchModel,
  ContactModel,
  ConversationModel,
  CorporateModel,
  ImportedLeadModel,
  LeadModel,
  MessageModel,
  ResetTokenModel,
  SimPlanModel,
  TaskModel,
  TeamMemberModel,
  UserModel,
  WebsiteLeadModel,
} from "./models";

// ── Types ──────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  passwordHash: string;
  createdAt: string;
  companyWebsite?: string;
  companyIndustry?: string;
  companyTimezone?: string;
  channels?: Record<string, boolean>;
  notificationPrefs?: Record<string, boolean>;
  notificationsReadAt?: string;
};

export type Notification = {
  id: string;
  type: "lead" | "visit" | "message" | "task";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
};

export type LeadDocument = {
  name: string;
  url: string;
  uploadedAt: string;
};

export type Lead = {
  id: string;
  ownerId: string;
  name: string;
  channel: Channel;
  value: number;
  stage: Stage;
  createdAt: string;
  whatsappId?: string;
  email?: string;
  phone?: string;
  color?: string;
  notes?: string;
  services?: string[];

  // FXPertise Forex & Remittance Fields
  serviceType?: string;
  sourceCurrency?: string;
  targetCurrency?: string;
  exchangeRate?: number;
  sourceAmount?: number;
  targetAmount?: number;
  fulfillmentType?: string;
  deliveryAddress?: string;
  panNumber?: string;
  passportNumber?: string;
  lrsPurpose?: string;
  travelDate?: string;
  assignedBranchId?: string;
  assignedBranchName?: string;
  corporateId?: string;
  corporateStatus?: string;

  // Education-specific
  city?: string;
  state?: string;
  neetStatus?: string;
  preferredCountry?: string;
  preferredUniversity1?: string;
  preferredUniversity2?: string;
  assignAgent?: string;
  // Payment amounts
  firstPayment?: number;
  secondPayment?: number;
  thirdPaymentAmount?: number;
  otcAmount?: number;
  totalServiceCharge?: number;
  // Client Visit Scope Fields
  companyName?: string;
  designation?: string;
  yearlyVolume?: number;
  rateOfferedCN?: number;
  rateOfferedCard?: number;
  rateOfferedTTDD?: number;
  nextFollowUp?: string;
  feedback?: string;
  clientVisitStatus?: string;

  // Documents
  documents?: LeadDocument[];
  proposalDoc?: LeadDocument | null;
  registrationDoc?: LeadDocument | null;
  admissionLetter?: LeadDocument | null;
  invoices?: LeadDocument[];
  otcInvoices?: LeadDocument[];
  invitationLetter?: LeadDocument | null;
  thirdPaymentInvoices?: LeadDocument[];
  visaDocuments?: LeadDocument[];

  deletedAt?: string | null;
};

export type Conversation = {
  id: string;
  ownerId: string;
  name: string;
  company: string;
  channel: Channel;
  preview: string;
  unread: number;
  updatedAt: string;
  whatsappId?: string;
};

export type Message = {
  id: string;
  conversationId: string;
  ownerId: string;
  from: "me" | "them";
  text: string;
  createdAt: string;
};

export type Task = {
  id: string;
  ownerId: string;
  title: string;
  contact: string;
  type: "call" | "email" | "meeting" | "message";
  dueDate: string;
  done: boolean;
  leadId?: string;
  leadName?: string;
};

export type Contact = {
  id: string;
  ownerId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  channel: Channel;
  tags: string[];
  createdAt: string;
};

export type TeamMember = {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  role: string;
};

export type WebsiteLead = {
  id: string;
  name: string;
  mobile: string;
  state?: string;
  neetStatus?: string;
  budget?: string;
  preferredCountry?: string;
  remarks?: string;
  source?: string;
  createdAt: string;
};

export type ImportedLead = {
  id: string;
  name: string;
  phone: string;
  rawPhone?: string;
  platform?: string;
  channel?: Channel;
  status: "pending" | "assigned" | "ignored";
  assignedToUserId?: string | null;
  assignedToUserName?: string | null;
  assignedLeadId?: string | null;
  assignedAt?: string | null;
  uploadedAt: string;
  fileName?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

export const DEFAULT_CHANNELS: Record<string, boolean> = {
  WhatsApp: true,
  Instagram: true,
  Facebook: true,
  Ads: true,
  Email: true,
  "Referral/Others": true,
};

export const DEFAULT_NOTIFICATION_PREFS: Record<string, boolean> = {
  "New lead assigned to me": true,
  "New message in inbox": true,
  "Task due reminders": true,
  "Weekly performance summary": false,
  "Product updates & tips": false,
};

function toPlain<T>(doc: unknown): T {
  if (!doc) return doc as T;
  const obj = (doc as { toObject?: () => Record<string, unknown> }).toObject?.() ?? (doc as Record<string, unknown>);
  // Convert Map fields (channels, notificationPrefs) to plain objects
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "_id" || k === "__v") continue;
    if (v instanceof Map) {
      result[k] = Object.fromEntries(v);
    } else {
      result[k] = v;
    }
  }
  if (result.stage === "Completed") {
    result.stage = "Confirmed";
  }
  return result as T;
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<User | undefined> {
  await dbConnect();
  const doc = await UserModel.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } });
  return doc ? toPlain<User>(doc) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  await dbConnect();
  const doc = await UserModel.findOne({ id });
  return doc ? toPlain<User>(doc) : undefined;
}

export async function createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
  await dbConnect();
  const newUser: User = { ...user, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  await UserModel.create(newUser);
  return newUser;
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await dbConnect();
  await UserModel.updateOne({ id: userId }, { $set: { passwordHash } });
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "name" | "email" | "phone">>
): Promise<User | undefined> {
  await dbConnect();
  const doc = await UserModel.findOneAndUpdate({ id: userId }, { $set: updates }, { returnDocument: "after" });
  return doc ? toPlain<User>(doc) : undefined;
}

export async function updateCompanyInfo(
  userId: string,
  updates: Partial<Pick<User, "company" | "companyWebsite" | "companyIndustry" | "companyTimezone">>
): Promise<User | undefined> {
  await dbConnect();
  const doc = await UserModel.findOneAndUpdate({ id: userId }, { $set: updates }, { returnDocument: "after" });
  return doc ? toPlain<User>(doc) : undefined;
}

export async function getUserChannels(userId: string): Promise<Record<string, boolean>> {
  await dbConnect();
  const doc = await UserModel.findOne({ id: userId });
  const user = doc ? toPlain<User>(doc) : undefined;
  return { ...DEFAULT_CHANNELS, ...(user?.channels ?? {}) };
}

export async function setUserChannel(userId: string, channel: string, connected: boolean): Promise<Record<string, boolean>> {
  await dbConnect();
  const doc = await UserModel.findOne({ id: userId });
  const user = doc ? toPlain<User>(doc) : undefined;
  if (!user) return DEFAULT_CHANNELS;
  const channels = { ...DEFAULT_CHANNELS, ...(user.channels ?? {}), [channel]: connected };
  await UserModel.updateOne({ id: userId }, { $set: { channels } });
  return channels;
}

export async function getNotificationPrefs(userId: string): Promise<Record<string, boolean>> {
  await dbConnect();
  const doc = await UserModel.findOne({ id: userId });
  const user = doc ? toPlain<User>(doc) : undefined;
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notificationPrefs ?? {}) };
}

export async function setNotificationPrefs(userId: string, prefs: Record<string, boolean>): Promise<Record<string, boolean>> {
  await dbConnect();
  const doc = await UserModel.findOne({ id: userId });
  const user = doc ? toPlain<User>(doc) : undefined;
  if (!user) return DEFAULT_NOTIFICATION_PREFS;
  const notificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(user.notificationPrefs ?? {}), ...prefs };
  await UserModel.updateOne({ id: userId }, { $set: { notificationPrefs } });
  return notificationPrefs;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  await dbConnect();
  const doc = await UserModel.findOne({ id: userId });
  const user = doc ? toPlain<User>(doc) : undefined;
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notificationPrefs ?? {}) };
  const readAt = user?.notificationsReadAt ? new Date(user.notificationsReadAt).getTime() : 0;
  const now = Date.now();
  const notifications: Notification[] = [];

  if (prefs["New lead assigned to me"]) {
    const since = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const leads = await LeadModel.find({ ownerId: userId, createdAt: { $gte: since } });
    for (const lead of leads) {
      const l = toPlain<Lead>(lead);
      notifications.push({
        id: `lead-${l.id}`,
        type: "lead",
        title: `New lead: ${l.name}`,
        message: `${l.channel} · ${l.stage}`,
        href: "/dashboard/leads",
        createdAt: l.createdAt,
        read: new Date(l.createdAt).getTime() <= readAt,
      });
    }
  }

  if (prefs["New message in inbox"]) {
    const convs = await ConversationModel.find({ ownerId: userId, unread: { $gt: 0 } });
    for (const conv of convs) {
      const c = toPlain<Conversation>(conv);
      notifications.push({
        id: `message-${c.id}`,
        type: "message",
        title: `New message from ${c.name}`,
        message: c.preview,
        href: "/dashboard/chats",
        createdAt: c.updatedAt,
        read: new Date(c.updatedAt).getTime() <= readAt,
      });
    }
  }

  if (prefs["Task due reminders"]) {
    const tasks = await TaskModel.find({ ownerId: userId, done: false, dueDate: { $lte: new Date().toISOString() } });
    for (const task of tasks) {
      const t = toPlain<Task>(task);
      notifications.push({
        id: `task-${t.id}`,
        type: "task",
        title: `Task due: ${t.title}`,
        message: t.contact,
        href: "/dashboard/calendar",
        createdAt: t.dueDate,
        read: new Date(t.dueDate).getTime() <= readAt,
      });
    }
  }

  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markNotificationsRead(userId: string): Promise<string> {
  await dbConnect();
  const now = new Date().toISOString();
  await UserModel.updateOne({ id: userId }, { $set: { notificationsReadAt: now } });
  return now;
}

// ── Reset tokens ───────────────────────────────────────────────────────────

export async function createResetToken(userId: string): Promise<{ token: string; userId: string; expiresAt: string }> {
  await dbConnect();
  await ResetTokenModel.deleteMany({ userId });
  const token = {
    token: crypto.randomUUID(),
    userId,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
  await ResetTokenModel.create(token);
  return token;
}

export async function getResetToken(token: string): Promise<{ token: string; userId: string; expiresAt: string } | undefined> {
  await dbConnect();
  const doc = await ResetTokenModel.findOne({ token });
  if (!doc) return undefined;
  const obj = toPlain<{ token: string; userId: string; expiresAt: string }>(doc);
  if (new Date(obj.expiresAt).getTime() < Date.now()) return undefined;
  return obj;
}

export async function deleteResetToken(token: string): Promise<void> {
  await dbConnect();
  await ResetTokenModel.deleteOne({ token });
}

// ── Leads ──────────────────────────────────────────────────────────────────

export async function getLeadById(id: string, ownerId: string): Promise<Lead | undefined> {
  await dbConnect();
  const doc = await LeadModel.findOne({ id, ownerId, deletedAt: null });
  return doc ? toPlain<Lead>(doc) : undefined;
}

export async function getAllUsers(): Promise<User[]> {
  await dbConnect();
  const docs = await UserModel.find({});
  return docs.map((d) => toPlain<User>(d));
}

export async function deleteUser(id: string): Promise<void> {
  await dbConnect();
  await UserModel.deleteOne({ id });
}

export async function getAllLeads(): Promise<Lead[]> {
  await dbConnect();
  const docs = await LeadModel.find({ deletedAt: null });
  return docs.map((d) => toPlain<Lead>(d));
}

export async function getLeadsByOwner(ownerId: string): Promise<Lead[]> {
  await dbConnect();
  const docs = await LeadModel.find({ ownerId, deletedAt: null });
  return docs.map((d) => toPlain<Lead>(d));
}

export async function getLeadByWhatsappId(ownerId: string, whatsappId: string): Promise<Lead | undefined> {
  await dbConnect();
  const doc = await LeadModel.findOne({ ownerId, whatsappId, deletedAt: null });
  return doc ? toPlain<Lead>(doc) : undefined;
}

export async function createLead(lead: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
  await dbConnect();
  const newLead: Lead = { ...lead, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  await LeadModel.create(newLead);
  return newLead;
}

export async function updateLead(
  id: string,
  ownerId: string,
  updates: Partial<Pick<Lead,
    "stage" | "value" | "name" | "channel" | "email" | "phone" | "color" | "notes" |
    "city" | "state" | "neetStatus" | "preferredCountry" | "preferredUniversity1" | "preferredUniversity2" | "assignAgent" | "ownerId" |
    "firstPayment" | "secondPayment" | "thirdPaymentAmount" | "otcAmount" | "totalServiceCharge" |
    "companyName" | "designation" | "yearlyVolume" | "rateOfferedCN" | "rateOfferedCard" | "rateOfferedTTDD" | "nextFollowUp" | "feedback" | "clientVisitStatus"
  >>
): Promise<Lead | undefined> {
  await dbConnect();
  const doc = await LeadModel.findOneAndUpdate({ id, ownerId }, { $set: updates }, { returnDocument: "after" });
  return doc ? toPlain<Lead>(doc) : undefined;
}

export async function deleteLead(id: string, ownerId: string): Promise<void> {
  await dbConnect();
  await LeadModel.updateOne({ id, ownerId }, { $set: { deletedAt: new Date().toISOString() } });
}

export async function getLeadByIdAdmin(id: string): Promise<Lead | undefined> {
  await dbConnect();
  const doc = await LeadModel.findOne({ id });
  return doc ? toPlain<Lead>(doc) : undefined;
}

export async function updateLeadAdmin(
  id: string,
  updates: Partial<Pick<Lead,
    "ownerId" | "stage" | "value" | "name" | "channel" | "email" | "phone" | "color" | "notes" |
    "city" | "state" | "neetStatus" | "preferredCountry" | "preferredUniversity1" | "preferredUniversity2" | "assignAgent" |
    "firstPayment" | "secondPayment" | "thirdPaymentAmount" | "otcAmount" | "totalServiceCharge" |
    "companyName" | "designation" | "yearlyVolume" | "rateOfferedCN" | "rateOfferedCard" | "rateOfferedTTDD" | "nextFollowUp" | "feedback" | "clientVisitStatus"
  >>
): Promise<Lead | undefined> {
  await dbConnect();
  const doc = await LeadModel.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: "after" });
  return doc ? toPlain<Lead>(doc) : undefined;
}

export async function deleteLeadAdmin(id: string): Promise<Lead | undefined> {
  await dbConnect();
  const doc = await LeadModel.findOneAndUpdate({ id }, { $set: { deletedAt: new Date().toISOString() } }, { returnDocument: "after" });
  return doc ? toPlain<Lead>(doc) : undefined;
}

export async function restoreLeadAdmin(id: string): Promise<Lead | undefined> {
  await dbConnect();
  const doc = await LeadModel.findOneAndUpdate({ id }, { $set: { deletedAt: null } }, { returnDocument: "after" });
  return doc ? toPlain<Lead>(doc) : undefined;
}

export async function restoreLead(id: string, ownerId: string): Promise<Lead | undefined> {
  await dbConnect();
  const doc = await LeadModel.findOneAndUpdate({ id, ownerId }, { $set: { deletedAt: null } }, { returnDocument: "after" });
  return doc ? toPlain<Lead>(doc) : undefined;
}

export async function getDeletedLeads(): Promise<Lead[]> {
  await dbConnect();
  const docs = await LeadModel.find({ deletedAt: { $ne: null } });
  return docs.map((d) => toPlain<Lead>(d));
}

export async function getDeletedLeadsByOwner(ownerId: string): Promise<Lead[]> {
  await dbConnect();
  const docs = await LeadModel.find({ ownerId, deletedAt: { $ne: null } });
  return docs.map((d) => toPlain<Lead>(d));
}

// ── Contacts ───────────────────────────────────────────────────────────────

export async function getContactsByOwner(ownerId: string): Promise<Contact[]> {
  await dbConnect();
  const docs = await ContactModel.find({ ownerId });
  return docs.map((d) => toPlain<Contact>(d));
}

export async function createContact(contact: Omit<Contact, "id" | "createdAt">): Promise<Contact> {
  await dbConnect();
  const newContact: Contact = { ...contact, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  await ContactModel.create(newContact);
  return newContact;
}

export async function updateContact(
  id: string,
  ownerId: string,
  updates: Partial<Pick<Contact, "name" | "company" | "email" | "phone" | "channel" | "tags">>
): Promise<Contact | undefined> {
  await dbConnect();
  const doc = await ContactModel.findOneAndUpdate({ id, ownerId }, { $set: updates }, { returnDocument: "after" });
  return doc ? toPlain<Contact>(doc) : undefined;
}

export async function deleteContact(id: string, ownerId: string): Promise<void> {
  await dbConnect();
  await ContactModel.deleteOne({ id, ownerId });
}

// ── Conversations ──────────────────────────────────────────────────────────

export async function getConversationsByOwner(ownerId: string): Promise<Conversation[]> {
  await dbConnect();
  // Delete any sample dummy conversations if they exist
  await ConversationModel.deleteMany({ ownerId, name: { $in: ["Ananya Sharma", "Rohan Verma", "Priya Patel"] } });
  const docs = await ConversationModel.find({ ownerId }).sort({ updatedAt: -1 });
  return docs.map((d) => toPlain<Conversation>(d));
}

export async function getConversationById(id: string, ownerId: string): Promise<Conversation | undefined> {
  await dbConnect();
  const doc = await ConversationModel.findOne({ id, ownerId });
  return doc ? toPlain<Conversation>(doc) : undefined;
}

export async function getConversationByWhatsappId(ownerId: string, whatsappId: string): Promise<Conversation | undefined> {
  await dbConnect();
  const doc = await ConversationModel.findOne({ ownerId, whatsappId });
  return doc ? toPlain<Conversation>(doc) : undefined;
}

export async function createConversation(conversation: Omit<Conversation, "id">): Promise<Conversation> {
  await dbConnect();
  const newConversation: Conversation = { ...conversation, id: crypto.randomUUID() };
  await ConversationModel.create(newConversation);
  return newConversation;
}

export async function getMessagesByConversation(conversationId: string, ownerId: string): Promise<Message[]> {
  await dbConnect();
  const docs = await MessageModel.find({ conversationId, ownerId }).sort({ createdAt: 1 });
  return docs.map((d) => toPlain<Message>(d));
}

export async function createMessage(conversationId: string, ownerId: string, from: "me" | "them", text: string): Promise<Message | undefined> {
  await dbConnect();
  const conversation = await ConversationModel.findOne({ id: conversationId, ownerId });
  if (!conversation) return undefined;

  const message: Message = {
    id: crypto.randomUUID(),
    conversationId,
    ownerId,
    from,
    text,
    createdAt: new Date().toISOString(),
  };
  await MessageModel.create(message);

  conversation.preview = text;
  conversation.updatedAt = message.createdAt;
  if (from === "them") {
    conversation.unread += 1;
  } else {
    conversation.unread = 0;
  }
  await conversation.save();

  return message;
}

export async function markConversationRead(id: string, ownerId: string): Promise<void> {
  await dbConnect();
  await ConversationModel.updateOne({ id, ownerId }, { $set: { unread: 0 } });
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export async function getTasksByOwner(ownerId: string): Promise<Task[]> {
  await dbConnect();
  const docs = await TaskModel.find({ ownerId }).sort({ dueDate: 1 });
  return docs.map((d) => toPlain<Task>(d));
}

export async function createTask(task: Omit<Task, "id">): Promise<Task> {
  await dbConnect();
  const newTask: Task = { ...task, id: crypto.randomUUID() };
  await TaskModel.create(newTask);
  return newTask;
}

export async function getTasksByLead(ownerId: string, leadId: string): Promise<Task[]> {
  await dbConnect();
  const docs = await TaskModel.find({ ownerId, leadId }).sort({ dueDate: 1 });
  return docs.map((d) => toPlain<Task>(d));
}

export async function updateTask(
  id: string,
  ownerId: string,
  updates: Partial<Pick<Task, "title" | "contact" | "type" | "dueDate" | "done" | "leadId" | "leadName">>
): Promise<Task | undefined> {
  await dbConnect();
  const doc = await TaskModel.findOneAndUpdate({ id, ownerId }, { $set: updates }, { returnDocument: "after" });
  return doc ? toPlain<Task>(doc) : undefined;
}

export async function deleteTask(id: string, ownerId: string): Promise<void> {
  await dbConnect();
  await TaskModel.deleteOne({ id, ownerId });
}

// ── Team members ───────────────────────────────────────────────────────────

export async function getTeamMembers(ownerId: string): Promise<TeamMember[]> {
  await dbConnect();
  const docs = await TeamMemberModel.find({ ownerId });
  return docs.map((d) => toPlain<TeamMember>(d));
}

export async function createTeamMember(member: Omit<TeamMember, "id">): Promise<TeamMember> {
  await dbConnect();
  const newMember: TeamMember = { ...member, id: crypto.randomUUID() };
  await TeamMemberModel.create(newMember);
  return newMember;
}

export async function deleteTeamMember(id: string, ownerId: string): Promise<void> {
  await dbConnect();
  await TeamMemberModel.deleteOne({ id, ownerId });
}

// ── Website Leads (from edufin.com) ────────────────────────────────────────

export async function getWebsiteLeads(): Promise<WebsiteLead[]> {
  await dbConnect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = await WebsiteLeadModel.find().sort({ createdAt: -1 }).limit(500).lean() as any[];
  return docs.map((d) => ({
    id: String(d._id),
    name: d.name ?? "",
    mobile: d.mobile ?? "",
    state: d.state,
    neetStatus: d.neetStatus,
    budget: d.budget,
    preferredCountry: d.preferredCountry,
    remarks: d.remarks,
    source: d.source,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt ?? ""),
  }));
}

// ── Seed sample data ───────────────────────────────────────────────────────

export async function seedAccountData(_ownerId: string): Promise<void> {
  // Seeding disabled
  return;
}

// ── FXPertise Forex & Marketplace DB Helpers ─────────────────────────────

export async function getAllBranches() {
  await dbConnect();
  const docs = await BranchModel.find();
  return docs.map((d) => d.toObject());
}

export async function getBranchById(id: string) {
  await dbConnect();
  const doc = await BranchModel.findOne({ id });
  return doc ? doc.toObject() : null;
}

export async function updateBranchMargins(branchId: string, margins: Record<string, { buyMargin: number; sellMargin: number }>) {
  await dbConnect();
  await BranchModel.updateOne({ id: branchId }, { $set: { margins } });
}

export async function createForexOrder(orderData: Partial<Lead>) {
  await dbConnect();
  const id = `fx-${crypto.randomUUID().slice(0, 8)}`;
  const newOrder = {
    ...orderData,
    id,
    ownerId: orderData.ownerId || "public-user",
    createdAt: new Date().toISOString(),
    stage: orderData.stage || "Initial",
    value: orderData.sourceAmount || 1000,
    channel: orderData.channel || "WhatsApp",
  };
  const doc = await LeadModel.create(newOrder);
  return doc.toObject();
}

export async function getAllCorporates() {
  await dbConnect();
  const docs = await CorporateModel.find();
  return docs.map((d) => d.toObject());
}

export async function createCorporateRequest(data: { companyName: string; hodEmail: string; city: string; monthlyLimitINR: number }) {
  await dbConnect();
  const id = `corp-${crypto.randomUUID().slice(0, 8)}`;
  const doc = await CorporateModel.create({
    id,
    ...data,
    usedAmountINR: 0,
    verificationStatus: "pending",
    createdAt: new Date().toISOString(),
  });
  return doc.toObject();
}

export async function getSimPlans(country?: string) {
  await dbConnect();
  const query = country ? { country: new RegExp(country, "i") } : {};
  const docs = await SimPlanModel.find(query);

  if (docs.length === 0) {
    const seedPlans = [
      { id: "sim-usa-1", country: "United States", planName: "USA Unlimited 30 Days", dataAllowance: "Unlimited 5G", validityDays: 30, priceINR: 2499, provider: "AT&T Partner" },
      { id: "sim-uk-1", country: "United Kingdom", planName: "UK & Europe 12GB", dataAllowance: "12 GB 4G/5G", validityDays: 30, priceINR: 1899, provider: "O2 Europe" },
      { id: "sim-uae-1", country: "United Arab Emirates", planName: "Dubai Tourist Pass 10GB", dataAllowance: "10 GB 5G + 100 Mins", validityDays: 15, priceINR: 2199, provider: "du Dubai" },
      { id: "sim-sg-1", country: "Singapore", planName: "SG & SEA 20GB", dataAllowance: "20 GB High Speed", validityDays: 14, priceINR: 1499, provider: "Singtel" },
    ];
    await SimPlanModel.insertMany(seedPlans);
    return seedPlans;
  }

  return docs.map((d) => d.toObject());
}

export type AdminSettings = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  company?: string;
  companyWebsite?: string;
  companyIndustry?: string;
  companyTimezone?: string;
  passwordHash?: string;
};

export async function getAdminSettings(): Promise<AdminSettings> {
  await dbConnect();
  let doc = await AdminSettingsModel.findOne({ id: "admin_settings" });
  if (!doc) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@fxpertise.com";
    doc = await AdminSettingsModel.create({
      id: "admin_settings",
      name: "Administrator",
      email: adminEmail,
      phone: "+91 98765 43210",
      role: "Super Admin",
      company: "Fxpertise Solution Pvt. Ltd.",
      companyWebsite: "https://fxpertise.com",
      companyIndustry: "Travel & Forex CRM",
      companyTimezone: "Asia/Kolkata (IST)",
    });
  }
  return toPlain<AdminSettings>(doc);
}

export async function updateAdminSettings(updates: Record<string, any>): Promise<AdminSettings> {
  await dbConnect();
  await AdminSettingsModel.updateOne(
    { id: "admin_settings" },
    { $set: updates },
    { upsert: true }
  );
  return getAdminSettings();
}

// ── Imported / Excel Leads ────────────────────────────────────────────────

export async function getImportedLeads(filter?: { status?: string }): Promise<ImportedLead[]> {
  await dbConnect();
  const query: Record<string, any> = {};
  if (filter?.status && filter.status !== "all") {
    query.status = filter.status;
  }
  const docs = await ImportedLeadModel.find(query).sort({ uploadedAt: -1 });
  return docs.map((d) => toPlain<ImportedLead>(d));
}

export async function createImportedLeads(
  leads: Array<Omit<ImportedLead, "id" | "uploadedAt" | "status">>
): Promise<{ created: ImportedLead[]; skippedCount: number; duplicates: string[] }> {
  await dbConnect();
  const now = new Date().toISOString();

  // 1. Gather all phone numbers and names to check against database
  const phonesToCheck = leads
    .map((l) => String(l.phone || "").replace(/\D/g, "").slice(-10))
    .filter((p) => p.length >= 7);

  // 2. Fetch existing phones from active CRM leads
  const existingCrmLeads = await LeadModel.find({
    deletedAt: null,
    phone: { $exists: true, $ne: "" },
  }).select("phone name");

  // 3. Fetch existing phones from Imported leads
  const existingImported = await ImportedLeadModel.find({
    phone: { $exists: true, $ne: "" },
  }).select("phone name");

  const existingPhoneSet = new Set<string>();
  for (const l of existingCrmLeads) {
    if (l.phone) {
      const clean = String(l.phone).replace(/\D/g, "").slice(-10);
      if (clean) existingPhoneSet.add(clean);
    }
  }
  for (const l of existingImported) {
    if (l.phone) {
      const clean = String(l.phone).replace(/\D/g, "").slice(-10);
      if (clean) existingPhoneSet.add(clean);
    }
  }

  // 4. Deduplicate within the incoming batch and against DB
  const seenInBatch = new Set<string>();
  const docsToInsert: any[] = [];
  const duplicates: string[] = [];

  for (const lead of leads) {
    const cleanPhone = String(lead.phone || "").replace(/\D/g, "").slice(-10);
    const key = cleanPhone || String(lead.name || "").toLowerCase().trim();

    // Check if exists in DB by phone
    if (cleanPhone && existingPhoneSet.has(cleanPhone)) {
      duplicates.push(`${lead.name} (${lead.rawPhone || lead.phone || "No phone"})`);
      continue;
    }

    // Check if duplicate within the same batch
    if (seenInBatch.has(key)) {
      duplicates.push(`${lead.name} (${lead.rawPhone || lead.phone || "Duplicate in file"})`);
      continue;
    }

    seenInBatch.add(key);
    if (cleanPhone) existingPhoneSet.add(cleanPhone);

    docsToInsert.push({
      ...lead,
      id: crypto.randomUUID(),
      status: "pending",
      uploadedAt: now,
    });
  }

  if (docsToInsert.length === 0) {
    return { created: [], skippedCount: duplicates.length, duplicates };
  }

  const created = await ImportedLeadModel.insertMany(docsToInsert);
  return {
    created: created.map((d) => toPlain<ImportedLead>(d)),
    skippedCount: duplicates.length,
    duplicates,
  };
}

export async function assignImportedLead(
  id: string,
  userId: string,
  userName: string
): Promise<{ importedLead: ImportedLead; lead: Lead } | null> {
  await dbConnect();
  const doc = await ImportedLeadModel.findOne({ id });
  if (!doc) return null;

  const imp = toPlain<ImportedLead>(doc);
  const now = new Date().toISOString();

  // Create lead in CRM with initial stage
  const createdLead = await createLead({
    ownerId: userId,
    name: imp.name,
    phone: imp.phone,
    channel: (imp.channel as Channel) || "Facebook",
    stage: "Initial",
    value: 0,
    notes: `Imported via Admin XLS Upload · Platform: ${imp.platform || "N/A"}${imp.fileName ? ` · File: ${imp.fileName}` : ""}`,
    services: [],
  });

  // Update ImportedLead record
  await ImportedLeadModel.updateOne(
    { id },
    {
      $set: {
        status: "assigned",
        assignedToUserId: userId,
        assignedToUserName: userName,
        assignedLeadId: createdLead.id,
        assignedAt: now,
      },
    }
  );

  const updatedImp = await ImportedLeadModel.findOne({ id });
  return {
    importedLead: toPlain<ImportedLead>(updatedImp!),
    lead: createdLead,
  };
}

export async function bulkAssignImportedLeads(
  ids: string[],
  userId: string,
  userName: string
): Promise<{ assignedCount: number; leads: Lead[] }> {
  await dbConnect();
  const docs = await ImportedLeadModel.find({ id: { $in: ids } });
  const leads: Lead[] = [];
  const now = new Date().toISOString();

  for (const doc of docs) {
    const imp = toPlain<ImportedLead>(doc);
    const createdLead = await createLead({
      ownerId: userId,
      name: imp.name,
      phone: imp.phone,
      channel: (imp.channel as Channel) || "Facebook",
      stage: "Initial",
      value: 0,
      notes: `Imported via Admin XLS Upload · Platform: ${imp.platform || "N/A"}${imp.fileName ? ` · File: ${imp.fileName}` : ""}`,
      services: [],
    });
    leads.push(createdLead);

    await ImportedLeadModel.updateOne(
      { id: imp.id },
      {
        $set: {
          status: "assigned",
          assignedToUserId: userId,
          assignedToUserName: userName,
          assignedLeadId: createdLead.id,
          assignedAt: now,
        },
      }
    );
  }

  return { assignedCount: leads.length, leads };
}

export async function distributeImportedLeads(
  ids: string[],
  users: Array<{ id: string; name: string }>
): Promise<{ assignedCount: number; leads: Lead[] }> {
  if (!users.length || !ids.length) return { assignedCount: 0, leads: [] };
  await dbConnect();
  const docs = await ImportedLeadModel.find({ id: { $in: ids } });
  const leads: Lead[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const user = users[i % users.length];
    const imp = toPlain<ImportedLead>(doc);

    const createdLead = await createLead({
      ownerId: user.id,
      name: imp.name,
      phone: imp.phone,
      channel: (imp.channel as Channel) || "Facebook",
      stage: "Initial",
      value: 0,
      notes: `Imported via Admin XLS Upload · Platform: ${imp.platform || "N/A"}${imp.fileName ? ` · File: ${imp.fileName}` : ""}`,
      services: [],
    });
    leads.push(createdLead);

    await ImportedLeadModel.updateOne(
      { id: imp.id },
      {
        $set: {
          status: "assigned",
          assignedToUserId: user.id,
          assignedToUserName: user.name,
          assignedLeadId: createdLead.id,
          assignedAt: now,
        },
      }
    );
  }

  return { assignedCount: leads.length, leads };
}

export async function deleteImportedLead(id: string): Promise<void> {
  await dbConnect();
  await ImportedLeadModel.deleteOne({ id });
}

export async function deleteImportedLeads(ids: string[]): Promise<number> {
  await dbConnect();
  const res = await ImportedLeadModel.deleteMany({ id: { $in: ids } });
  return res.deletedCount || 0;
}

