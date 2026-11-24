// Detecta desbordes horizontales en teléfono: lista los elementos que sobrepasan el ancho de la pantalla.
const puppeteer = require("puppeteer-core");
const path = require("path");
const W = Number(process.env.W || 390);
const OUT = path.join(__dirname, "mobile" + W);
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || "http://localhost:3360";
const ROUTES = ["/", "/bandeja", "/bandeja?c=cv_1", "/casos", "/casos/k_3", "/casos/k_3/cotizacion", "/crm/clientes", "/crm/clientes/c_1", "/comercial/pipeline", "/comercial/agenda", "/comercial/red", "/polizas", "/polizas/pol_1", "/renovaciones", "/ia/asistente", "/ia/supervision", "/ia/automatizaciones", "/ia/agentes", "/financiero", "/erp/financiero", "/erp/administrativo", "/academia", "/academia/autos", "/gerencial/analitica", "/config/seguros", "/config/integraciones", "/config/usuarios"];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(OUT, "00_login.png"), fullPage: true });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.click("form button[type=submit]");
  await wait(2500);

  let i = 1;
  const report = async (label) => {
    const res = await page.evaluate((W) => {
      const docW = document.documentElement.scrollWidth;
      const offenders = [];
      for (const el of document.querySelectorAll("body *")) {
        if (el.closest("body > div header.sticky")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= W + 1) continue;
        // ignorar elementos dentro de contenedores con scroll horizontal propio
        let p = el.parentElement, scrolled = false;
        while (p && p !== document.body) { const s = getComputedStyle(p); if ((s.overflowX === "auto" || s.overflowX === "scroll" || s.overflowX === "hidden") && p.getBoundingClientRect().right <= W + 1) { scrolled = true; break; } p = p.parentElement; }
        if (scrolled) continue;
        offenders.push({ tag: el.tagName.toLowerCase(), cls: (el.className?.baseVal ?? el.className ?? "").toString().slice(0, 90), right: Math.round(r.right), text: (el.textContent || "").trim().slice(0, 40) });
      }
      // quedarse con los más profundos (el culpable real)
      const deep = offenders.filter((o, i) => !offenders.slice(i + 1).some((x) => x.text && o.text.includes(x.text) && x.right === o.right));
      return { docW, offenders: deep.slice(0, 5) };
    }, W);
    const flag = res.docW > W + 1 ? `DESBORDA (${res.docW}px)` : "ok";
    console.log(`${label} → ${flag}`);
    if (res.docW > W + 1) res.offenders.forEach((o) => console.log(`    <${o.tag} class="${o.cls}"> right=${o.right} «${o.text}»`));
  };

  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: "networkidle0" });
    await wait(1000);
    await report(r);
    await page.screenshot({ path: path.join(OUT, String(i++).padStart(2, "0") + r.replace(/[/?=]+/g, "_") + ".png"), fullPage: true });
  }
  // Menús desplegables del topbar
  await page.goto(BASE + "/", { waitUntil: "networkidle0" }); await wait(800);
  const bell = await page.$("header button.relative");
  if (bell) { await bell.click(); await wait(500); await report("menú notificaciones"); await page.screenshot({ path: path.join(OUT, "zz_notif.png") }); }
  console.log("Errores JS:", errors.length);
  await browser.close();
})();
