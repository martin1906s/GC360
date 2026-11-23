const puppeteer = require("puppeteer-core");
const path = require("path");
const W = Number(process.env.W || 1280); const OUT = path.join(__dirname, "audit" + W);
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3360";
const ROUTES = ["/", "/bandeja", "/casos", "/casos/k_3", "/casos/k_3/cotizacion", "/crm/clientes", "/crm/clientes/c_1", "/comercial/pipeline", "/comercial/agenda", "/comercial/red", "/polizas", "/polizas/pol_1", "/renovaciones", "/ia/asistente?q=Casos%20pendientes%20m%C3%A1s%20de%2048%20horas", "/ia/supervision", "/ia/automatizaciones", "/ia/agentes", "/financiero", "/erp/financiero", "/erp/administrativo", "/academia", "/gerencial/analitica", "/config/seguros", "/config/usuarios", "/config/saas", "/casos/k_6", "/crm/clientes/c_2", "/polizas/pol_7"];

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--window-size=1440,900"] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: 800 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`[pageerror ${page.url()}] ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`[console ${page.url()}] ${m.text()}`));

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(OUT, "00_login.png") });
  const btn = await page.$("form button[type=submit]");
  await btn.click();
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));

  let i = 1;
  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: "networkidle0" });
    await new Promise((res) => setTimeout(res, r.includes("asistente") ? 3500 : 1200));
    const name = String(i++).padStart(2, "0") + "_" + r.replace(/[/?=%]+/g, "_").slice(0, 40) + ".png";
    await page.screenshot({ path: path.join(OUT, name), fullPage: true });
    const h1 = await page.$eval("h1", (e) => e.textContent).catch(() => "(sin h1)");
    console.log(r, "→", h1);
  }
  console.log("\nERRORS:", errors.length);
  errors.slice(0, 30).forEach((e) => console.log(e));
  await browser.close();
})();
