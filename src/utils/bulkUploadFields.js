const buildBulkFieldKeys = (field, file, index) => {
  const originalName = file?.originalname || "";
  const fieldName = file?.fieldname || "";

  return [
    `${field}_${fieldName}_${index}`,
    `${field}_${originalName}_${index}`,
    `${field}_${file?.filename || originalName}_${index}`,
    `${field}_${index}`,
  ];
};

const getBulkFieldValue = (body = {}, field, file, index, fallback = "") => {
  const keys = buildBulkFieldKeys(field, file, index);

  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return fallback;
};

module.exports = {
  buildBulkFieldKeys,
  getBulkFieldValue,
};
