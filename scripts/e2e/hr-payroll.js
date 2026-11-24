// Prueba nómina (aprobar/rechazar/pagar), ficha de empleado y resúmenes KPI del ERP.
const puppeteer = require("puppeteer-core");
const path = require("path");
const OUT = path.join(__dirname, "shots-hr");
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || "http://localhost:3360";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 860 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`[console] ${m.text()}`));
  const click = async (text, sel = "button, a") => {
    const ok = await page.evaluate((t, s) => { const el = [...document.querySelectorAll(s)].filter((e) => e.offsetParent !== null && (e.textContent.trim().includes(t) || e.title === t)).pop(); if (el) el.click(); return !!el; }, text, sel);
    if (!ok) throw new Error("No encontré: " + text);
    await wait(500);
  };
  const has = (t) => page.evaluate((t) => document.body.innerText.includes(t), t);
  const shot = (n, full = true) => page.screenshot({ path: path.join(OUT, n + ".png"), fullPage: full });

  try {
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.click("form button[type=submit]"); // Gerencia
    await wait(2500);

    // Ficha de empleado
    await page.goto(BASE + "/erp/administrativo?m=rrhh", { waitUntil: "networkidle0" }); await wait(900);
    await shot("01_rrhh");
    await page.evaluate(() => [...document.querySelectorAll("tbody tr")].find((r) => r.textContent.includes("Andrés Gómez"))?.click()); await wait(800);
    await shot("02_ficha", false);
    console.log("✔ Ficha abierta:", await page.evaluate(() => document.body.innerText.toLowerCase().includes("seguridad social")));
    await click("Desempeño"); await wait(400);
    console.log("✔ Desempeño visible:", await has("primer semestre"));
    await page.keyboard.press("Escape"); await wait(400);

    // Nómina
    await page.goto(BASE + "/erp/administrativo?m=nomina", { waitUntil: "networkidle0" }); await wait(900);
    await click("Novedad"); await wait(300);
    await page.evaluate(() => { const inp = document.querySelector('.fixed input[type=number]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(inp, "320000"); inp.dispatchEvent(new Event("input", { bubbles: true })); });
    await click("Guardar"); await wait(400);
    console.log("✔ Novedad registrada:", await has("320.000"));
    await click("Liquidar nómina"); await wait(1500);
    await page.evaluate(() => [...document.querySelectorAll("tbody tr")].find((r) => r.textContent.includes("Julián Restrepo"))?.querySelector('button[title="Rechazar pago"]')?.click()); await wait(500);
    await click("Rechazar pago"); await wait(500);
    console.log("✔ Pago rechazado con motivo:", await has("Motivo:"));
    await click("Aprobar pendientes"); await wait(500);
    await shot("03_nomina_aprobacion");
    await click("Enviar pago al banco"); await wait(2000);
    console.log("✔ Pago enviado:", await has("Pagado") && await has("DISP-"));
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Desprendible")?.click()); await wait(500);
    await shot("04_desprendible", false);
    console.log("✔ Desprendible:", await has("Neto a pagar"));
    await page.keyboard.press("Escape");

    // Resumen financiero
    await page.goto(BASE + "/erp/financiero?m=contabilidad", { waitUntil: "networkidle0" }); await wait(900);
    await shot("05_financiero_contabilidad");
    console.log("✔ KPIs financiero:", await has("Disponible en bancos") && await has("Utilidad operacional"));
    await page.goto(BASE + "/erp/financiero?m=recaudos", { waitUntil: "networkidle0" }); await wait(900);
    await shot("06_financiero_recaudos");
    await page.goto(BASE + "/erp/financiero?m=conciliacion", { waitUntil: "networkidle0" }); await wait(900);
    await shot("07_financiero_conciliacion");

    // Teléfono
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    for (const r of ["/erp/administrativo?m=nomina", "/erp/administrativo?m=rrhh", "/erp/financiero?m=recaudos"]) {
      await page.goto(BASE + r, { waitUntil: "networkidle0" }); await wait(900);
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      console.log(`${w > 391 ? "✘" : "✔"} Teléfono ${r}: ancho ${w}px`);
      await shot("m_" + r.replace(/[/?=]+/g, "_"));
    }
  } catch (e) {
    console.log("✘", e.message);
    await shot("99_fail");
  }
  console.log("Errores:", errors.length);
  errors.slice(0, 10).forEach((e) => console.log(e));
  await browser.close();
})();
