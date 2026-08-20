const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { adminPassword, uploadLimitMb } = require("./config");

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const dataDir = path.join(rootDir, "data");
const pageTemplatesDir = path.join(dataDir, "pages");
const uploadsDir = path.join(publicDir, "assets", "uploads");
const exportDir = path.join(rootDir, "export");
const maxUploadMb = Math.max(1, Number(process.env.LOCAL_UPLOAD_LIMIT_MB || uploadLimitMb || 1024));
const maxUploadBytes = maxUploadMb * 1024 * 1024;
const allowedPages = new Set([
  "index.html",
  "about.html",
  "academics.html",
  "admissions.html",
  "news.html",
  "contact.html"
]);
const sessions = new Map();

for (const directory of [dataDir, pageTemplatesDir, uploadsDir, exportDir]) {
  fs.mkdirSync(directory, { recursive: true });
}

const auditFile = path.join(dataDir, "activity.json");
const newsFile = path.join(publicDir, "data", "news.json");
const sectionColorsFile = path.join(dataDir, "section-colors.json");
const sectionColorsCssFile = path.join(publicDir, "css", "section-colors.css");
const usersFile = path.join(dataDir, "users.json");
const tickerFile = path.join(dataDir, "ticker-settings.json");
if (!fs.existsSync(auditFile)) fs.writeFileSync(auditFile, "[]\n", "utf8");
if (!fs.existsSync(tickerFile)) fs.writeFileSync(tickerFile, `${JSON.stringify({ mode: "latest", customMessage: "" }, null, 2)}\n`, "utf8");

const sectionColorDefinitions = {
  header: { label: "Header and navigation", selector: ".site-header", type: "header" },
  hero: { label: "Shared video hero overlay", selector: "#introStage", type: "hero" },
  homeHero: { label: "Home feature segment", selector: "#routeContent #homeHero", type: "section" },
  belief: { label: "Home belief segment", selector: "#routeContent .chapter-belief", type: "section" },
  academics: { label: "Home academics segment", selector: "#routeContent .chapter-academics", type: "section" },
  president: { label: "Home president segment", selector: "#routeContent .chapter-president", type: "section" },
  news: { label: "Home news segment", selector: "#routeContent .chapter-news", type: "section" },
  cta: { label: "Home call-to-action segment", selector: "#routeContent .chapter-cta", type: "section" },
  pageContent: { label: "Inner-page content segments", selector: "#routeContent .section:not(.chapter-belief):not(.chapter-academics):not(.chapter-president):not(.chapter-news):not(.chapter-cta)", type: "section" },
  ticker: { label: "News announcement ticker", selector: ".announcement-ticker", type: "ticker" },
  footer: { label: "Universal footer", selector: ".site-footer", type: "footer" }
};

function isHexColor(value) { return /^#[0-9a-fA-F]{6}$/.test(String(value || "")); }
function rgba(hex, alpha) { const value = String(hex || "#000000").slice(1); return `rgba(${parseInt(value.slice(0, 2), 16)},${parseInt(value.slice(2, 4), 16)},${parseInt(value.slice(4, 6), 16)},${alpha})`; }
function numberBetween(value, min, max, fallback) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback; }
function normaliseSectionSettings(key, raw = {}) {
  const text = isHexColor(raw.text) ? raw.text : "#14161c";
  const accent = isHexColor(raw.accent) ? raw.accent : "#0b7a32";
  return {
    label: sectionColorDefinitions[key].label,
    background: isHexColor(raw.background) ? raw.background : "#fafafc",
    text,
    heading: isHexColor(raw.heading) ? raw.heading : text,
    accent,
    link: isHexColor(raw.link) ? raw.link : accent,
    button: isHexColor(raw.button) ? raw.button : accent,
    buttonText: isHexColor(raw.buttonText) ? raw.buttonText : "#ffffff",
    border: isHexColor(raw.border) ? raw.border : accent,
    overlay: isHexColor(raw.overlay) ? raw.overlay : "#064d22",
    overlayOpacity: numberBetween(raw.overlayOpacity, 0, 1, 0.72),
    gradientEnabled: Boolean(raw.gradientEnabled),
    gradientEnd: isHexColor(raw.gradientEnd) ? raw.gradientEnd : (isHexColor(raw.background) ? raw.background : "#fafafc"),
    paddingY: Math.round(numberBetween(raw.paddingY, 0, 180, 0)),
    visible: raw.visible !== false
  };
}
function readSectionColors() {
  const raw = JSON.parse(fs.readFileSync(sectionColorsFile, "utf8"));
  return Object.fromEntries(Object.keys(sectionColorDefinitions).map((key) => [key, normaliseSectionSettings(key, raw[key]) ]));
}
function sectionBlock(selector, colors) {
  const background = colors.gradientEnabled ? `linear-gradient(135deg,${colors.background},${colors.gradientEnd})` : colors.background;
  return `${selector}{background:${background}!important;color:${colors.text}!important;${colors.paddingY ? `padding-top:${colors.paddingY}px!important;padding-bottom:${colors.paddingY}px!important;` : ""}${colors.visible ? "" : "display:none!important;"}}${selector} h1,${selector} h2,${selector} h3,${selector} h4{color:${colors.heading}!important}${selector} p,${selector} li{color:${colors.text}!important}${selector} .eyebrow,${selector} .tag{color:${colors.accent}!important}${selector} .text-link,${selector} a:not(.btn){color:${colors.link}!important}${selector} .btn,${selector} button:not(.nav-toggle){background:${colors.button}!important;color:${colors.buttonText}!important;border-color:${colors.border}!important}${selector} .card{border-color:${colors.border}!important}`;
}
function renderSectionColorsCss(colors) {
  const header = colors.header; const hero = colors.hero; const ticker = colors.ticker; const footer = colors.footer;
  const blocks = Object.entries(sectionColorDefinitions).filter(([key]) => !["header", "hero", "ticker", "footer"].includes(key)).map(([key, definition]) => sectionBlock(definition.selector, colors[key])).join("\n");
  const headerBackground = header.gradientEnabled ? `linear-gradient(135deg,${header.background},${header.gradientEnd})` : header.background;
  const tickerBackground = ticker.gradientEnabled ? `linear-gradient(135deg,${ticker.background},${ticker.gradientEnd})` : ticker.background;
  const footerBackground = footer.gradientEnabled ? `linear-gradient(135deg,${footer.background},${footer.gradientEnd})` : footer.background;
  return `/* GENERATED LOCAL SECTION STYLES — edit through Local Admin or data/section-colors.json. */\n.site-header{background:${headerBackground}!important;${header.visible ? "" : "display:none!important;"}}.site-header .brand-word b,.site-header .brand-word span,.site-header .nav-links a{color:${header.text}!important}.site-header .nav-links a.active{color:${header.accent}!important}.site-header .nav-links a.active::after{background:${header.accent}!important}\n#introStage .intro-stage__veil{background:linear-gradient(90deg,${rgba(hero.overlay, hero.overlayOpacity)},${rgba(hero.overlay, Math.max(.08, hero.overlayOpacity - .30))})!important}#introStage .intro-stage__content h1{color:${hero.heading}!important}#introStage .intro-stage__content p,#introStage .intro-stage__side-note{color:${hero.text}!important}#introStage .intro-stage__kicker,#introStage .intro-stage__content em,#introStage .intro-stage__enter span{color:${hero.accent}!important}${hero.visible ? "" : "#introStage{display:none!important;}"}\n${blocks}\n.announcement-ticker{background:${tickerBackground}!important;color:${ticker.text}!important;${ticker.visible ? "" : "display:none!important;"}}.announcement-ticker .announcement-ticker__item{color:${ticker.text}!important}.announcement-ticker .announcement-ticker__item::selection{background:${ticker.accent}}\n.site-footer{background:${footerBackground}!important;color:${footer.text}!important;${footer.visible ? "" : "display:none!important;"}}.site-footer h4,.site-footer .footer-brand b{color:${footer.heading}!important}.site-footer a:hover,.site-footer .local-admin-link{color:${footer.link}!important}\n`;
}
function writeSectionColors(colors) {
  const normalised = Object.fromEntries(Object.keys(sectionColorDefinitions).map((key) => [key, normaliseSectionSettings(key, colors[key]) ]));
  fs.writeFileSync(sectionColorsFile, `${JSON.stringify(normalised, null, 2)}\n`, "utf8");
  fs.writeFileSync(sectionColorsCssFile, renderSectionColorsCss(normalised), "utf8");
}
function readTickerSettings() { try { const raw = JSON.parse(fs.readFileSync(tickerFile, "utf8")); return { mode: raw.mode === "custom" ? "custom" : "latest", customMessage: String(raw.customMessage || "").slice(0, 500) }; } catch { return { mode: "latest", customMessage: "" }; } }
function writeTickerSettings(settings) { fs.writeFileSync(tickerFile, `${JSON.stringify(settings, null, 2)}\n`, "utf8"); }
if (!fs.existsSync(sectionColorsFile)) {
  throw new Error("Missing required data/section-colors.json source configuration.");
}
writeSectionColors(readSectionColors());

function readCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key]) => key)
      .map(([key, ...value]) => [key, decodeURIComponent(value.join("="))])
  );
}

function cleanUsername(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 48); }
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(String(password), salt, 64).toString("hex")}`;
}
function passwordMatches(password, stored) {
  const [salt, digest] = String(stored || "").split(":");
  if (!salt || !digest) return false;
  const incoming = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return incoming.length === digest.length && crypto.timingSafeEqual(Buffer.from(incoming), Buffer.from(digest));
}
function readUsers() { return JSON.parse(fs.readFileSync(usersFile, "utf8")); }
function writeUsers(users) { fs.writeFileSync(usersFile, `${JSON.stringify(users, null, 2)}\n`, "utf8"); }
function safeUser(user) { return { id: user.id, username: user.username, displayName: user.displayName, role: user.role, enabled: user.enabled, createdAt: user.createdAt, updatedAt: user.updatedAt }; }
function ensureMasterAdmin() {
  const initialPassword = String(process.env.LOCAL_ADMIN_PASSWORD || adminPassword || "123");
  const users = fs.existsSync(usersFile) ? readUsers() : [];
  if (users.some((user) => user.username === "admin" && user.role === "master")) return;
  const now = new Date().toISOString();
  users.unshift({ id: crypto.randomUUID(), username: "admin", displayName: "Master Admin", role: "master", enabled: true, passwordHash: hashPassword(initialPassword), createdAt: now, updatedAt: now });
  writeUsers(users);
}
ensureMasterAdmin();
function currentUser(request) {
  const session = sessions.get(readCookies(request).lgcLocalAdmin);
  if (!session) return null;
  try { return readUsers().find((user) => user.id === session.userId && user.enabled) || null; } catch { return null; }
}
function isAuthenticated(request) {
  return Boolean(currentUser(request));
}

function requireAdmin(request, response, next) {
  const user = currentUser(request);
  if (!user) {
    return response.status(401).json({ error: "Local Admin sign-in required." });
  }
  request.user = user;
  next();
}
function requireMasterAdmin(request, response, next) {
  requireAdmin(request, response, () => {
    if (request.user.role !== "master") return response.status(403).json({ error: "Only the Master Admin can manage local accounts and view reports." });
    next();
  });
}

function pagePath(page) {
  if (!allowedPages.has(page)) throw new Error("Unsupported page.");
  return path.join(pageTemplatesDir, page);
}

function sharedVideoSource() {
  const shell = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
  return shell.match(/<source id="sharedHeroVideoSource" src="([^"]+)"/)?.[1] || "";
}

function updateSharedVideoSource(source) {
  const shellPath = path.join(publicDir, "index.html");
  const shell = fs.readFileSync(shellPath, "utf8");
  fs.writeFileSync(shellPath, shell.replace(/(<source id="sharedHeroVideoSource" src=")[^"]+/, `$1${source}`), "utf8");
}

function auditContext(action, details) {
  const detail = String(details || "");
  if (action.includes("section colors") || action.includes("section colors")) return { area: "Design", sourceFile: "data/section-colors.json + public/css/section-colors.css" };
  if (action.includes("structured content")) return { area: "Structured content", sourceFile: `data/pages/${detail}` };
  if (action.includes("page source")) return { area: "Advanced page source", sourceFile: `data/pages/${detail}` };
  if (action.includes("ticker")) return { area: "News ticker", sourceFile: "data/ticker-settings.json" };
  if (action.includes("news")) return { area: "News", sourceFile: "public/data/news.json" };
  if (action.includes("shared video")) return { area: "Shared media", sourceFile: "public/index.html" };
  if (action.includes("media")) return { area: "Media", sourceFile: detail.includes(":") ? `data/pages/${detail.split(":")[0]}` : "public/assets/uploads" };
  if (action.includes("page")) return { area: "Page content", sourceFile: `data/pages/${detail}` };
  if (action.includes("local user") || action.includes("password")) return { area: "User access", sourceFile: "data/users.json" };
  if (action.includes("export")) return { area: "Export", sourceFile: detail };
  if (action.includes("Signed")) return { area: "Access", sourceFile: "Local session" };
  return { area: "Local Admin", sourceFile: "data/activity.json" };
}
function appendAudit(action, details, actor) {
  let entries = [];
  try {
    entries = JSON.parse(fs.readFileSync(auditFile, "utf8"));
  } catch {
    entries = [];
  }
  entries.unshift({ id: crypto.randomUUID(), time: new Date().toISOString(), action, details, ...auditContext(action, details), actor: actor ? { id: actor.id, username: actor.username, displayName: actor.displayName, role: actor.role } : null });
  fs.writeFileSync(auditFile, JSON.stringify(entries.slice(0, 250), null, 2), "utf8");
}

function cleanFileName(name) {
  return String(name || "upload").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, uploadsDir),
    filename: (_request, file, callback) => {
      callback(null, `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${cleanFileName(file.originalname)}`);
    }
  }),
  limits: { fileSize: maxUploadBytes },
  fileFilter: (_request, file, callback) => {
    if (/^(image|video)\//.test(file.mimetype)) return callback(null, true);
    callback(new Error("Only image and video files are allowed."));
  }
});

app.use(express.json({ limit: "5mb" }));
app.use((_request, response, next) => {
  response.setHeader("X-LGC-Local-Server", "1");
  next();
});

app.get("/api/admin/status", (request, response) => {
  response.json({ authenticated: isAuthenticated(request), user: currentUser(request) ? safeUser(currentUser(request)) : null });
});

app.post("/api/admin/login", (request, response) => {
  ensureMasterAdmin();
  const username = cleanUsername(request.body?.username || "admin");
  const submitted = String(request.body?.password || "");
  const user = readUsers().find((item) => item.username === username && item.enabled);
  if (!user || !passwordMatches(submitted, user.passwordHash)) return response.status(401).json({ error: "Incorrect username or password." });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id });
  response.setHeader("Set-Cookie", `lgcLocalAdmin=${token}; HttpOnly; SameSite=Strict; Path=/`);
  appendAudit("Signed in", "Local Admin opened the editor.", user);
  response.json({ ok: true, user: safeUser(user) });
});

app.post("/api/admin/logout", requireAdmin, (request, response) => {
  sessions.delete(readCookies(request).lgcLocalAdmin);
  response.setHeader("Set-Cookie", "lgcLocalAdmin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
  appendAudit("Signed out", "Local Admin session closed.", request.user);
  response.json({ ok: true });
});

app.get("/api/admin/users", requireMasterAdmin, (_request, response) => {
  response.json(readUsers().map(safeUser));
});

app.post("/api/admin/users", requireMasterAdmin, (request, response) => {
  const username = cleanUsername(request.body?.username);
  const displayName = String(request.body?.displayName || "").trim().slice(0, 80);
  const password = String(request.body?.password || "");
  const role = "editor";
  if (!username || !displayName || password.length < 8) return response.status(400).json({ error: "Provide a username, display name, and a password with at least 8 characters." });
  const users = readUsers();
  if (users.some((user) => user.username === username)) return response.status(400).json({ error: "That username is already in use." });
  const now = new Date().toISOString();
  const user = { id: crypto.randomUUID(), username, displayName, role, enabled: true, passwordHash: hashPassword(password), createdAt: now, updatedAt: now };
  users.push(user); writeUsers(users); appendAudit("Created local user", `${username} (${role})`, request.user); response.json({ ok: true, user: safeUser(user) });
});

app.put("/api/admin/users/:id", requireMasterAdmin, (request, response) => {
  const users = readUsers(); const user = users.find((item) => item.id === request.params.id);
  if (!user) return response.status(404).json({ error: "Local user not found." });
  const enabled = Boolean(request.body?.enabled);
  if (user.role === "master" && !enabled) return response.status(400).json({ error: "The Master Admin account must remain enabled." });
  user.displayName = String(request.body?.displayName || user.displayName).trim().slice(0, 80) || user.displayName;
  user.enabled = enabled; user.updatedAt = new Date().toISOString(); writeUsers(users);
  appendAudit("Updated local user", `${user.username} (${user.role}, ${user.enabled ? "enabled" : "disabled"})`, request.user); response.json({ ok: true, user: safeUser(user) });
});

app.put("/api/admin/users/:id/password", requireMasterAdmin, (request, response) => {
  const password = String(request.body?.password || ""); if (password.length < 3) return response.status(400).json({ error: "Use a password with at least 3 characters." });
  const users = readUsers(); const user = users.find((item) => item.id === request.params.id); if (!user) return response.status(404).json({ error: "Local user not found." });
  user.passwordHash = hashPassword(password); user.updatedAt = new Date().toISOString(); writeUsers(users); appendAudit("Reset local user password", user.username, request.user); response.json({ ok: true });
});

app.delete("/api/admin/users/:id", requireMasterAdmin, (request, response) => {
  const users = readUsers(); const user = users.find((item) => item.id === request.params.id);
  if (!user) return response.status(404).json({ error: "Local user not found." });
  if (user.role === "master") return response.status(400).json({ error: "The Master Admin account cannot be removed." });
  writeUsers(users.filter((item) => item.id !== user.id));
  for (const [token, session] of sessions) if (session.userId === user.id) sessions.delete(token);
  appendAudit("Removed local user", user.username, request.user); response.json({ ok: true });
});

app.get("/api/admin/pages", requireAdmin, (_request, response) => {
  response.json([...allowedPages].map((file) => ({
    file,
    label: file === "index.html" ? "Home" : file.replace(".html", "").replace(/^./, (letter) => letter.toUpperCase())
  })));
});

app.get("/api/admin/upload-settings", requireAdmin, (_request, response) => {
  response.json({ maxUploadMb, recommendedImageMb: 30, recommendedVideoMb: 300 });
});

app.get("/api/admin/shared-video", requireAdmin, (_request, response) => {
  response.json({ source: sharedVideoSource() });
});

app.get("/api/admin/section-colors", requireAdmin, (_request, response) => {
  response.json({ sections: sectionColorDefinitions, colors: readSectionColors(), sourceFiles: ["data/section-colors.json", "public/css/section-colors.css"] });
});

app.put("/api/admin/section-colors", requireAdmin, (request, response) => {
  try {
    const key = String(request.body?.key || "");
    const incoming = request.body?.colors || {};
    if (!sectionColorDefinitions[key]) return response.status(400).json({ error: "Choose a valid website segment." });
    if (!["background", "text", "heading", "accent", "link", "button", "buttonText", "border", "overlay", "gradientEnd"].every((field) => isHexColor(incoming[field]))) {
      return response.status(400).json({ error: "Use a full hex color code such as #064d22 for every color field." });
    }
    const colors = readSectionColors();
    colors[key] = normaliseSectionSettings(key, incoming);
    writeSectionColors(colors);
    appendAudit("Updated section colors", `${key} → data/section-colors.json and public/css/section-colors.css`, request.user);
    response.json({ ok: true, colors: colors[key], sourceFiles: ["data/section-colors.json", "public/css/section-colors.css"] });
  } catch (error) { response.status(400).json({ error: error.message }); }
});

app.post("/api/admin/section-colors/reset", requireAdmin, (request, response) => {
  try {
    const key = String(request.body?.key || "");
    const defaults = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "section-colors.defaults.json"), "utf8"));
    if (!sectionColorDefinitions[key] || !defaults[key]) return response.status(400).json({ error: "Choose a valid website segment." });
    const colors = readSectionColors(); colors[key] = defaults[key]; writeSectionColors(colors);
    appendAudit("Reset section colors", `${key} restored in local color source files`, request.user);
    response.json({ ok: true, colors: colors[key] });
  } catch (error) { response.status(400).json({ error: error.message }); }
});

app.get("/api/public/ticker-settings", (_request, response) => {
  response.json(readTickerSettings());
});

app.get("/api/admin/ticker-settings", requireAdmin, (_request, response) => {
  response.json({ ...readTickerSettings(), sourceFile: "data/ticker-settings.json" });
});

app.put("/api/admin/ticker-settings", requireAdmin, (request, response) => {
  const mode = request.body?.mode === "custom" ? "custom" : "latest";
  const customMessage = String(request.body?.customMessage || "").trim().slice(0, 500);
  if (mode === "custom" && !customMessage) return response.status(400).json({ error: "Write a custom marquee announcement before selecting custom mode." });
  const settings = { mode, customMessage };
  writeTickerSettings(settings);
  appendAudit("Updated ticker announcement", mode === "custom" ? "Custom marquee message → data/ticker-settings.json" : "Automatic three-latest-news mode → data/ticker-settings.json", request.user);
  response.json({ ok: true, ...settings, sourceFile: "data/ticker-settings.json" });
});

app.get("/api/public/page/:page", (request, response) => {
  try { response.json({ html: fs.readFileSync(pagePath(request.params.page), "utf8") }); }
  catch (error) { response.status(404).json({ error: error.message }); }
});

app.get("/api/public/shared-video", (_request, response) => {
  response.json({ source: sharedVideoSource() });
});

app.get("/api/admin/page/:page", requireAdmin, (request, response) => {
  try {
    const file = pagePath(request.params.page);
    response.json({ file: request.params.page, html: fs.readFileSync(file, "utf8") });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.put("/api/admin/page/:page", requireAdmin, (request, response) => {
  try {
    const file = pagePath(request.params.page);
    const html = String(request.body?.html || "");
    if (!html.toLowerCase().includes("<html") || html.length > 2_000_000) {
      return response.status(400).json({ error: "Please save a complete HTML page under 2 MB." });
    }
    fs.writeFileSync(file, html, "utf8");
    const action = request.body?.changeType === "source" ? "Updated page source" : "Updated structured content";
    appendAudit(action, request.params.page, request.user);
    response.json({ ok: true });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.post("/api/admin/media", requireAdmin, upload.single("file"), (request, response) => {
  try {
    const page = String(request.body?.page || "");
    const original = String(request.body?.original || "");
    if (!request.file || !original || !original.startsWith("assets/")) {
      return response.status(400).json({ error: "Choose a file and a valid local media reference." });
    }
    const file = pagePath(page);
    const publicUrl = `assets/uploads/${request.file.filename}`;
    const previousHtml = fs.readFileSync(file, "utf8");
    if (!previousHtml.includes(original)) {
      return response.status(400).json({ error: "That media reference is no longer in the selected page." });
    }
    fs.writeFileSync(file, previousHtml.split(original).join(publicUrl), "utf8");
    appendAudit("Replaced media", `${page}: ${original} → ${publicUrl}`, request.user);
    response.json({ ok: true, url: publicUrl });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.post("/api/admin/shared-video", requireAdmin, upload.single("file"), (request, response) => {
  try {
    if (!request.file || !String(request.file.mimetype).startsWith("video/")) {
      return response.status(400).json({ error: "Choose a video file for the shared website background." });
    }
    const publicUrl = `assets/uploads/${request.file.filename}`;
    updateSharedVideoSource(publicUrl);
    appendAudit("Updated shared video", publicUrl, request.user);
    response.json({ ok: true, url: publicUrl });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.get("/api/admin/activity", requireMasterAdmin, (_request, response) => {
  response.json(JSON.parse(fs.readFileSync(auditFile, "utf8")));
});

app.get("/api/admin/news", requireAdmin, (_request, response) => {
  response.json(JSON.parse(fs.readFileSync(newsFile, "utf8")));
});

app.put("/api/admin/news", requireAdmin, (request, response) => {
  const news = request.body?.news;
  if (!Array.isArray(news) || news.length > 50 || news.some((item) => !item || typeof item !== "object")) {
    return response.status(400).json({ error: "Please provide up to 50 local news entries." });
  }
  const cleaned = news.map((item) => ({
    showDate: String(item.showDate || "").slice(0, 10),
    type: String(item.type || "Announcement").slice(0, 80),
    title: String(item.title || "Untitled announcement").slice(0, 180),
    message: String(item.message || "").slice(0, 2000)
  }));
  fs.writeFileSync(newsFile, JSON.stringify(cleaned, null, 2), "utf8");
  appendAudit("Updated news", `${cleaned.length} local announcement(s)`, request.user);
  response.json({ ok: true });
});

app.post("/api/admin/export", requireAdmin, (_request, response) => {
  const folderName = `lgc-export-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const target = path.join(exportDir, folderName);
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(publicDir, path.join(target, "public"), { recursive: true });
  fs.cpSync(pageTemplatesDir, path.join(target, "data", "pages"), { recursive: true });
  fs.copyFileSync(sectionColorsFile, path.join(target, "data", "section-colors.json"));
  if (fs.existsSync(usersFile)) fs.copyFileSync(usersFile, path.join(target, "data", "users.json"));
  fs.copyFileSync(tickerFile, path.join(target, "data", "ticker-settings.json"));
  fs.copyFileSync(path.join(rootDir, "data", "section-colors.defaults.json"), path.join(target, "data", "section-colors.defaults.json"));
  fs.cpSync(path.join(rootDir, "admin"), path.join(target, "admin"), { recursive: true });
  ["server.js", "config.js", "package.json", "README.md", ".gitignore"].forEach((file) => {
    fs.copyFileSync(path.join(rootDir, file), path.join(target, file));
  });
  appendAudit("Created export", `export/${folderName}`, request.user);
  response.json({ ok: true, folder: `export/${folderName}` });
});

app.get("/admin", (_request, response) => {
  response.sendFile(path.join(rootDir, "admin", "index.html"));
});

app.use("/admin", express.static(path.join(rootDir, "admin")));
app.get(["/", "/index.html", "/about.html", "/academics.html", "/admissions.html", "/news.html", "/contact.html"], (_request, response) => {
  response.sendFile(path.join(publicDir, "index.html"));
});
app.use(express.static(publicDir));

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error?.code === "LIMIT_FILE_SIZE") {
    return response.status(413).json({ error: `File too large. The Local Admin allows up to ${maxUploadMb} MB per image or video.` });
  }
  response.status(400).json({ error: error.message || "The local server could not complete that request." });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`LGC local website is running only on: http://localhost:${port}`);
  console.log(`Local Admin editor: http://localhost:${port}/admin`);
});
