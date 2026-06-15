const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

let driveClient = null;

const FOLDER_MAP = {
  "surat-masuk": "GDRIVE_FOLDER_SURAT_MASUK",
  "surat-keluar": "GDRIVE_FOLDER_SURAT_KELUAR",
  sertifikat: "GDRIVE_FOLDER_SERTIFIKAT",
};

const getAuth = () => {
  const clientPath = path.resolve(__dirname, "../../credentials/oauth-client.json");
  const tokenPath = path.resolve(__dirname, "../../credentials/drive-token.json");

  if (!fs.existsSync(clientPath)) {
    throw new Error(`OAuth client credentials not found: ${clientPath}`);
  }
  if (!fs.existsSync(tokenPath)) {
    throw new Error(`OAuth token not found: ${tokenPath}. Run scripts/oauth-setup.js first.`);
  }

  const keys = JSON.parse(fs.readFileSync(clientPath, "utf8"));
  const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf8"));

  const oauth2Client = new google.auth.OAuth2(
    keys.web.client_id,
    keys.web.client_secret,
    "http://localhost:3001/oauth2callback"
  );

  oauth2Client.setCredentials(tokens);

  oauth2Client.on("tokens", (newTokens) => {
    if (newTokens.refresh_token) {
      tokens.refresh_token = newTokens.refresh_token;
    }
    tokens.access_token = newTokens.access_token;
    tokens.expiry_date = newTokens.expiry_date;
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  });

  return oauth2Client;
};

const getDrive = async () => {
  if (driveClient) return driveClient;
  const auth = getAuth();
  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
};

exports.uploadFile = async (filePath, mimeType, folderType) => {
  const drive = await getDrive();

  const envKey = FOLDER_MAP[folderType];
  const folderId = envKey ? process.env[envKey] : process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error(`Folder not configured for type: ${folderType}`);
  }

  const fileName = path.basename(filePath);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || "application/octet-stream",
      body: fs.createReadStream(filePath),
    },
    fields: "id, name, mimeType, size",
    supportsAllDrives: true,
  });

  return {
    fileId: response.data.id,
    name: response.data.name,
    mimeType: response.data.mimeType,
  };
};

exports.moveFile = async (fileId, newFolderId) => {
  const drive = await getDrive();

  const file = await drive.files.get({
    fileId,
    fields: "parents",
    supportsAllDrives: true,
  });

  const oldParents = file.data.parents.join(",");
  await drive.files.update({
    fileId,
    addParents: newFolderId,
    removeParents: oldParents,
    fields: "id, parents",
    supportsAllDrives: true,
  });
};

exports.getFileStream = async (fileId) => {
  const drive = await getDrive();

  const response = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );

  return response.data;
};

exports.getFileMetadata = async (fileId) => {
  const drive = await getDrive();

  const response = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, webContentLink, parents",
    supportsAllDrives: true,
  });

  return response.data;
};

exports.deleteFile = async (fileId) => {
  const drive = await getDrive();

  await drive.files.delete({ fileId, supportsAllDrives: true });
};

exports.downloadToTemp = async (fileId) => {
  const drive = await getDrive();
  const meta = await exports.getFileMetadata(fileId);
  const stream = await exports.getFileStream(fileId);

  const tmpDir = path.join(__dirname, "../../uploads/tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tmpPath = path.join(tmpDir, meta.name);
  const writer = fs.createWriteStream(tmpPath);

  return new Promise((resolve, reject) => {
    stream.pipe(writer);
    writer.on("finish", () => resolve(tmpPath));
    writer.on("error", reject);
  });
};
