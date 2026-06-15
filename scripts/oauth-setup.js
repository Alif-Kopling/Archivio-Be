const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials", "oauth-client.json");
const TOKEN_PATH = path.join(__dirname, "..", "credentials", "drive-token.json");
const REDIRECT_URI = "http://localhost:3001/oauth2callback";
const PORT = 3001;

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error("Credentials not found at", CREDENTIALS_PATH);
  process.exit(1);
}

const keys = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const oauth2Client = new google.auth.OAuth2(
  keys.web.client_id,
  keys.web.client_secret,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

const server = http.createServer(async (req, res) => {
  const query = url.parse(req.url, true).query;

  if (req.url.startsWith("/oauth2callback")) {
    if (query.error) {
      res.end(`<h1>Error: ${query.error}</h1><p>You can close this tab.</p>`);
      console.error("Auth error:", query.error);
      return;
    }

    const code = query.code;
    try {
      const { tokens } = await oauth2Client.getToken(code);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      res.end(`
        <h1>Authorization successful!</h1>
        <p>Token saved to <code>credentials/drive-token.json</code></p>
        <p>You can close this tab.</p>
      `);
      console.log("Token saved to", TOKEN_PATH);
    } catch (err) {
      res.end(`<h1>Error getting token: ${err.message}</h1>`);
      console.error("Token error:", err);
    } finally {
      server.close();
    }
  } else {
    res.writeHead(302, { Location: authUrl });
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`\nOpen this URL in your browser:\n`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log("It will redirect you to Google login. Authorize the app.");
  console.log("The token will be saved automatically.\n");
});
