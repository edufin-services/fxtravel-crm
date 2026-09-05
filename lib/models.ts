import mongoose, { Schema, model, models } from "mongoose";

if (process.env.NODE_ENV !== "production") {
  Object.keys(mongoose.models).forEach((name) => {
    delete (mongoose.models as Record<string, unknown>)[name];
  });
}

// ── User ──────────────────────────────────────────────────────────────────

const UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  company: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  passwordHash: { type: String, required: true },
  createdAt: { type: String, required: true },
  role: { type: String, enum: ["admin", "user", "branch_vendor", "corporate_hod", "corporate_employee"], default: "user" },
  branchId: String,
  corporateId: String,
  companyWebsite: String,
  companyIndustry: String,
  companyTimezone: String,
  channels: { type: Map, of: Boolean },
  notificationPrefs: { type: Map, of: Boolean },
  notificationsReadAt: String,
});

export const UserModel = models.User ?? model("User", UserSchema);

// ── ResetToken ────────────────────────────────────────────────────────────

const ResetTokenSchema = new Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  expiresAt: { type: String, required: true },
});

export const ResetTokenModel = models.ResetToken ?? model("ResetToken", ResetTokenSchema);

// ── Lead / Forex Order ────────────────────────────────────────────────────

const LeadDocumentSchema = new Schema(
  { name: { type: String, required: true }, url: { type: String, required: true }, uploadedAt: { type: String, required: true } },
  { _id: false }
);

const LeadSchema = new Schema({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  channel: { type: String, required: true },
  value: { type: Number, required: true },
  stage: { type: String, required: true },
  createdAt: { type: String, required: true },
  whatsappId: String,
  email: String,
  phone: String,
  color: String,
  notes: String,
  reminderAt: String,
  services: [String],

  // FXPertise Forex & Remittance Fields
  serviceType: { type: String, default: "Tours & Packages" },
  sourceCurrency: { type: String, default: "INR" },
  targetCurrency: { type: String, default: "USD" },
  exchangeRate: { type: Number, default: 86.5 },
  sourceAmount: { type: Number, default: 0 },
  targetAmount: { type: Number, default: 0 },
  city: { type: String, default: "" },
  fulfillmentType: { type: String, enum: ["doorstep", "branch_pickup"], default: "doorstep" },
  deliveryAddress: String,
  panNumber: String,
  passportNumber: String,
  lrsPurpose: String,
  travelDate: String,
  assignedBranchId: String,
  assignedBranchName: String,
  corporateId: String,
  corporateStatus: { type: String, enum: ["none", "pending_hod_approval", "approved", "rejected"], default: "none" },

  // Client Visit Scope Fields
  companyName: String,
  designation: String,
  yearlyVolume: { type: Number, default: 0 },
  rateOfferedCN: { type: Number, default: 0 },
  rateOfferedCard: { type: Number, default: 0 },
  rateOfferedTTDD: { type: Number, default: 0 },
  nextFollowUp: String,
  feedback: String,
  clientVisitStatus: { type: String, enum: ["Live", "Disc in progress", "Converted", "Not interested"], default: "Live" },

  // Documents
  documents: [LeadDocumentSchema],
  passportDoc: { type: LeadDocumentSchema, default: null },
  visaDoc: { type: LeadDocumentSchema, default: null },
  ticketDoc: { type: LeadDocumentSchema, default: null },
  formA2Doc: { type: LeadDocumentSchema, default: null },
  bankProofDoc: { type: LeadDocumentSchema, default: null },

  deletedAt: { type: String, default: null, index: true },
});

LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ ownerId: 1, createdAt: -1 });

export const LeadModel = models.Lead ?? model("Lead", LeadSchema);

// ── Branch / Vendor ───────────────────────────────────────────────────────

const BranchSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  city: { type: String, required: true, index: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  kycStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "verified" },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  walletBalance: { type: Number, default: 50000 },
  // Rate margins relative to base rate (e.g. buyMargin: -0.5, sellMargin: +0.8)
  margins: {
    type: Map,
    of: new Schema({ buyMargin: Number, sellMargin: Number }, { _id: false }),
    default: {},
  },
  createdAt: { type: String, required: true },
});

export const BranchModel = models.Branch ?? model("Branch", BranchSchema);

// ── LowestPrice (Precomputed Lowest Rates per City & Currency) ───────────

const LowestPriceSchema = new Schema({
  id: { type: String, required: true, unique: true },
  city: { type: String, required: true, index: true },
  currency: { type: String, required: true, index: true },
  bestBuyRate: { type: Number, required: true },
  bestSellRate: { type: Number, required: true },
  bestBranchId: { type: String, required: true },
  bestBranchName: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

export const LowestPriceModel = models.LowestPrice ?? model("LowestPrice", LowestPriceSchema);

// ── Corporate ─────────────────────────────────────────────────────────────

const CorporateSchema = new Schema({
  id: { type: String, required: true, unique: true },
  companyName: { type: String, required: true },
  hodEmail: { type: String, required: true },
  city: { type: String, required: true },
  monthlyLimitINR: { type: Number, default: 1000000 },
  usedAmountINR: { type: Number, default: 0 },
  verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "verified" },
  createdAt: { type: String, required: true },
});

export const CorporateModel = models.Corporate ?? model("Corporate", CorporateSchema);

// ── SIM Plan Catalog ──────────────────────────────────────────────────────

const SimPlanSchema = new Schema({
  id: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  planName: { type: String, required: true },
  dataAllowance: { type: String, required: true },
  validityDays: { type: Number, required: true },
  priceINR: { type: Number, required: true },
  provider: { type: String, required: true },
});

export const SimPlanModel = models.SimPlan ?? model("SimPlan", SimPlanSchema);

// ── Conversation & Messaging ──────────────────────────────────────────────

const ConversationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  company: { type: String, required: true },
  channel: { type: String, required: true },
  preview: { type: String, default: "" },
  unread: { type: Number, default: 0 },
  updatedAt: { type: String, required: true },
  whatsappId: String,
});

export const ConversationModel = models.Conversation ?? model("Conversation", ConversationSchema);

const MessageSchema = new Schema({
  id: { type: String, required: true, unique: true },
  conversationId: { type: String, required: true, index: true },
  ownerId: { type: String, required: true },
  from: { type: String, enum: ["me", "them"], required: true },
  text: { type: String, required: true },
  createdAt: { type: String, required: true },
});

export const MessageModel = models.Message ?? model("Message", MessageSchema);

// ── Task & Contact ────────────────────────────────────────────────────────

const TaskSchema = new Schema({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  contact: { type: String, required: true },
  type: { type: String, enum: ["call", "email", "meeting", "message"], required: true },
  dueDate: { type: String, required: true },
  done: { type: Boolean, default: false },
  leadId: String,
  leadName: String,
});

export const TaskModel = models.Task ?? model("Task", TaskSchema);

const ContactSchema = new Schema({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  company: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  channel: { type: String, required: true },
  tags: [String],
  createdAt: { type: String, required: true },
});

export const ContactModel = models.Contact ?? model("Contact", ContactSchema);

const TeamMemberSchema = new Schema({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
});

export const TeamMemberModel = models.TeamMember ?? model("TeamMember", TeamMemberSchema);

const WebsiteLeadSchema = new Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  state: String,
  remarks: String,
  source: { type: String, default: "website" },
  createdAt: { type: Date, default: Date.now },
}, { collection: "websiteLeads" });

export const WebsiteLeadModel = models.WebsiteLead ?? model("WebsiteLead", WebsiteLeadSchema);

// ── Admin Settings ────────────────────────────────────────────────────────

const AdminSettingsSchema = new Schema({
  id: { type: String, default: "admin_settings" },
  name: { type: String, default: "Administrator" },
  email: { type: String, default: "admin@fxpertise.com" },
  phone: { type: String, default: "+91 98765 43210" },
  role: { type: String, default: "Super Admin" },
  company: { type: String, default: "Fxpertise Solution Pvt. Ltd." },
  companyWebsite: { type: String, default: "https://fxpertise.com" },
  companyIndustry: { type: String, default: "Travel & Forex CRM" },
  companyTimezone: { type: String, default: "Asia/Kolkata (IST)" },
  passwordHash: String,
  metaRoundRobinIndex: { type: Number, default: 0 },
});

export const AdminSettingsModel = models.AdminSettings ?? model("AdminSettings", AdminSettingsSchema);

// ── Imported / Excel Leads ────────────────────────────────────────────────

const ImportedLeadSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  rawPhone: { type: String, default: "" },
  platform: { type: String, default: "fb" },
  channel: { type: String, default: "Facebook" },
  status: { type: String, enum: ["pending", "assigned", "ignored"], default: "pending", index: true },
  assignedToUserId: { type: String, default: null, index: true },
  assignedToUserName: { type: String, default: null },
  assignedLeadId: { type: String, default: null },
  assignedAt: { type: String, default: null },
  uploadedAt: { type: String, required: true, index: true },
  fileName: { type: String, default: "" },
});

export const ImportedLeadModel = models.ImportedLead ?? model("ImportedLead", ImportedLeadSchema);

// ── Lead Activity / Change Event ──────────────────────────────────────────

const LeadActivitySchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ["stage_change", "new_lead", "lead_confirmed", "lead_updated", "lead_deleted"],
    required: true,
    index: true,
  },
  leadId: { type: String, required: true, index: true },
  leadName: { type: String, required: true },
  channel: { type: String, default: "WhatsApp" },
  ownerId: { type: String, default: "" },
  ownerName: { type: String, default: "" },
  previousStage: { type: String, default: "" },
  newStage: { type: String, default: "" },
  value: { type: Number, default: 0 },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  details: { type: String, default: "" },
  timestamp: { type: String, required: true, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
});

export const LeadActivityModel = models.LeadActivity ?? model("LeadActivity", LeadActivitySchema);

// ── Report Settings ───────────────────────────────────────────────────────

const ReportSettingsSchema = new Schema({
  id: { type: String, default: "report_settings", unique: true },
  dailyEnabled: { type: Boolean, default: true },
  weeklyEnabled: { type: Boolean, default: true },
  dailyReportTime: { type: String, default: "20:00" }, // 8:00 PM IST
  weeklyReportDay: { type: Number, default: 0 }, // 0 = Sunday
  lastDailySentAt: { type: String, default: null },
  lastWeeklySentAt: { type: String, default: null },
  customRecipientEmail: { type: String, default: "" },
});

export const ReportSettingsModel = models.ReportSettings ?? model("ReportSettings", ReportSettingsSchema);

// ── Email Report Log ──────────────────────────────────────────────────────

const EmailReportLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  reportType: { type: String, enum: ["daily", "weekly", "manual"], required: true, index: true },
  recipient: { type: String, required: true },
  subject: { type: String, required: true },
  sentAt: { type: String, required: true, index: true },
  status: { type: String, enum: ["success", "failed"], default: "success" },
  leadCount: { type: Number, default: 0 },
  stageChangeCount: { type: Number, default: 0 },
  confirmedCount: { type: Number, default: 0 },
  periodStart: { type: String, default: "" },
  periodEnd: { type: String, default: "" },
  error: { type: String, default: "" },
});

export const EmailReportLogModel = models.EmailReportLog ?? model("EmailReportLog", EmailReportLogSchema);
