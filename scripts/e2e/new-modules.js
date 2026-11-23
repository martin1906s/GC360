// Verifica las pantallas de Integraciones, ERP financiero/administrativo y el reproductor de Academia.
const puppeteer = require("puppeteer-core");
const path = require("path");
const OUT = path.join(__dirname, "shots-new");
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3360";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 800 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`[console] ${m.text()}`));
  const click = async (text, sel = "button, a") => {
    const ok = await page.evaluate((t, s) => { const el = [...document.querySelectorAll(s)].filter((e) => e.offsetParent !== null && e.textContent.trim().includes(t)).pop(); if (el) el.click(); return !!el; }, text, sel);
    if (!ok) throw new Error("No encontré: " + text);
    await wait(600);
  };
  const shot = (n, full = true) => page.screenshot({ path: path.join(OUT, n + ".png"), fullPage: full });

  try {
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.click("form button[type=submit]");
    await wait(2500);

    // Integraciones: Microsoft 365 de punta a punta
    await page.goto(BASE + "/config/integraciones", { waitUntil: "networkidle0" }); await wait(800);
    await shot("01_integraciones");
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Conectar"))?.click()); await wait(800);
    await click("Iniciar sesión con Microsoft"); await wait(1200);
    await shot("02_m365_consent", false);
    await click("Aceptar"); await click("Continuar"); await click("Continuar");
    await click("Probar conexión y activar"); await wait(3500);
    await shot("03_m365_ok", false);
    console.log("✔ Integración Microsoft 365 conectada");

    // Financiero: 6 pantallas
    for (const m of ["facturacion", "contabilidad", "conciliacion", "tesoreria", "pagar", "recaudos"]) {
      await page.goto(BASE + "/erp/financiero?m=" + m, { waitUntil: "networkidle0" }); await wait(900);
      await shot("fin_" + m);
    }
    await page.goto(BASE + "/erp/financiero?m=facturacion", { waitUntil: "networkidle0" }); await wait(800);
    await click("Emitir"); await click("Emitir y enviar a la DIAN"); await wait(1800);
    console.log("✔ Factura emitida:", await page.evaluate(() => document.body.innerText.includes("Aceptada")));

    // Administrativo: 7 pantallas
    for (const m of ["rrhh", "nomina", "compras", "proveedores", "inventario", "activos", "sedes"]) {
      await page.goto(BASE + "/erp/administrativo?m=" + m, { waitUntil: "networkidle0" }); await wait(900);
      await shot("adm_" + m);
    }
    await page.goto(BASE + "/erp/administrativo?m=nomina", { waitUntil: "networkidle0" }); await wait(800);
    await click("Liquidar nómina"); await wait(1500);
    console.log("✔ Nómina liquidada:", await page.evaluate(() => document.body.innerText.includes("Aprobar y pagar")));

    // Academia: reproductor
    await page.goto(BASE + "/academia/autos", { waitUntil: "networkidle0" }); await wait(900);
    await page.evaluate(() => document.querySelector(".aspect-video")?.click());
    await wait(3500);
    await shot("acad_player", false);
    console.log("✔ Reproductor avanzando:", await page.evaluate(() => /0:0[2-9]|0:1\d/.test(document.body.innerText)));
  } catch (e) {
    console.log("✘", e.message);
    await shot("99_fail");
  }
  console.log("Errores:", errors.length);
  errors.slice(0, 15).forEach((e) => console.log(e));
  await browser.close();
})();
