const STATUS_ALIASES = {
  draft: "pending",
  pending: "pending",
  submitted: "pending",
  review: "pending",
  waiting: "pending",
  approve: "final",
  approved: "final",
  final: "final",
  publish: "final",
  published: "final",
  reject: "rejected",
  rejected: "rejected",
  decline: "rejected",
  declined: "rejected",
  deny: "rejected",
  denied: "rejected",
};

const STATUS_FIELDS = ["status", "approvalStatus", "nextStatus", "decision", "action"];
const PENDING_STATUS_VALUES = ["draft", "pending", "submitted", "review", "waiting"];
const VERIFIED_STATUS_VALUES = ["final", "approved", "approve", "publish", "published"];
const REJECTED_STATUS_VALUES = ["rejected", "reject", "decline", "declined", "deny", "denied"];

const normalizeStatus = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  return STATUS_ALIASES[normalizedValue] || null;
};

const resolveStatusInput = (payload = {}) => {
  for (const field of STATUS_FIELDS) {
    const normalized = normalizeStatus(payload[field]);
    if (normalized) {
      return normalized;
    }
  }

  if (typeof payload.approved === "boolean") {
    return payload.approved ? "approved" : "rejected";
  }

  return null;
};

const getInitialStatus = () => {
  return "pending";
};

const normalizeDocumentDate = (value) => {
  if (!(typeof value === "string" || value instanceof Date)) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const sanitizeDocumentUpdate = (payload = {}) => {
  const data = {};

  if (typeof payload.title === "string" && payload.title.trim()) {
    data.title = payload.title.trim();
  }

  if (typeof payload.sender === "string" && payload.sender.trim()) {
    data.sender = payload.sender.trim();
  }

  const documentDate = normalizeDocumentDate(payload.documentDate);
  if (documentDate) {
    data.documentDate = documentDate;
  }

  const normalizedStatus = resolveStatusInput(payload);
  if (normalizedStatus) {
    data.status = normalizedStatus;
  }

  return data;
};

module.exports = {
  getInitialStatus,
  resolveStatusInput,
  normalizeDocumentDate,
  sanitizeDocumentUpdate,
  PENDING_STATUS_VALUES,
  VERIFIED_STATUS_VALUES,
  REJECTED_STATUS_VALUES,
};
