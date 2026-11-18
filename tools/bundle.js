// Bundle the player into one self-contained HTML file (double-click to play, no server).
// Inlines styles.css, ascii_data.js, renderer.js, app.js and the song as a data: URI.
// Usage: node tools/bundle.js   ->  ASCII-Hachiware.html
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const AUDIO = "【ちいかわ】ひとりごつ.mp4";
const OUT = "ASCII-Hachiware.html";

// a literal "</script" inside inlined code would end the tag early
const safe = (js) => js.replace(/<\/script/gi, "<\\/script");
const audioUri = "data:video/mp4;base64," + fs.readFileSync(path.join(ROOT, AUDIO)).toString("base64");

let html = read("index.html");
html = html.replace(/<link rel="stylesheet" href="styles.css" \/>/, () => `<style>\n${read("styles.css")}</style>`);
for (const f of ["ascii_data.js", "renderer.js"]) {
  html = html.replace(`<script src="${f}"></script>`, () => `<script>\n${safe(read(f))}</script>`);
}
const app = read("app.js").replace(
  'audio.src = encodeURI("./【ちいかわ】ひとりごつ.mp4");',
  "audio.src = window.HACHIWARE_AUDIO_URI;"
);
if (app === read("app.js")) throw new Error("audio line in app.js not found; update tools/bundle.js");
html = html.replace(
  '<script src="app.js"></script>',
  () => `<script>window.HACHIWARE_AUDIO_URI = "${audioUri}";</script>\n<script>\n${safe(app)}</script>`
);
if (/<script src=|href="styles.css"/.test(html)) throw new Error("something was not inlined");

fs.writeFileSync(path.join(ROOT, OUT), html);
console.log(`${OUT}  ${(html.length / 1e6).toFixed(1)} MB`);
