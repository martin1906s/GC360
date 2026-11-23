const puppeteer = require("puppeteer-core");
const path = require("path");
const OUT = path.join(__dirname, "flow");
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3360";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`[console] ${m.text()}`));

  const clickText = async (text, sel = "button, a, label") => {
    const ok = await page.evaluate((text, sel) => {
      const els = [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null && e.textContent.trim().includes(text));
      const el = els[els.length - 1];
      if (!el) return false;
      el.click();
      return true;
    }, text, sel);
    if (!ok) throw new Error("No encontré: " + text);
    await wait(700);
  };
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + ".png") });
  const step = (s) => console.log("✔", s);
  const login = async (userName) => {
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.removeItem("gc360-session-v1"));
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    if (userName.tenant) await clickText(userName.tenant);
    await clickText(userName.name, "button");
    await page.click("form button[type=submit]");
    await wait(4000);
  };

  try {
    // Reset de datos
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());

    // F01 — asesor recibe WhatsApp, IA clasifica, crea caso
    await login({ name: "Andrés Gómez" });
    await page.goto(BASE + "/bandeja", { waitUntil: "networkidle0" });
    await clickText("Mensaje de prueba");
    await clickText("WhatsApp · Cotizar vehículo");
    await wait(800);
    await shot("01_inbound");
    const analysis = await page.evaluate(() => document.body.innerText.includes("Nueva cotización") && document.body.innerText.includes("GTX-318"));
    step("F01 mensaje entrante clasificado por IA (placa extraída: " + analysis + ")");
    await clickText("Crear caso");
    await wait(300);
    await page.evaluate(() => [...document.querySelectorAll("[role=dialog], .fixed button")].find((b) => b.textContent.trim() === "Crear caso" && b.closest(".fixed"))?.click());
    await wait(1000);
    const code = await page.evaluate(() => (document.body.innerText.match(/CAS-2026-\d{4}/g) || []).pop());
    await shot("02_case_created");
    step("F01 caso creado: " + code);

    // Abrir el caso
    const caseHref = await page.evaluate(() => [...document.querySelectorAll("a[href^='/casos/']")].map((a) => a.getAttribute("href")).pop());
    await page.goto(BASE + caseHref, { waitUntil: "networkidle0" });
    await wait(600);
    await page.goto(BASE + caseHref + "/cotizacion", { waitUntil: "networkidle0", timeout: 120000 });
    await wait(1500);
    await clickText("Extraer datos con IA");
    await wait(1500);
    await page.evaluate(() => {
      const set = (label, v) => {
        const l = [...document.querySelectorAll("label")].find((x) => x.textContent.includes(label));
        const inp = l?.querySelector("input");
        if (!inp) return;
        const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        proto.call(inp, v);
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      };
      set("Valor asegurado", "98000000");
      set("Conductor principal", "Alejandro Torres");
    });
    await shot("03_request");
    await clickText("Solicitar ofertas");
    step("F02 solicitud enviada a 3 aseguradoras (simulado)");

    for (let i = 0; i < 3; i++) {
      await clickText("Registrar oferta");
      await clickText("Usar valores de ejemplo");
      await page.evaluate(() => [...document.querySelectorAll(".fixed button")].find((b) => b.textContent.trim() === "Registrar oferta")?.click());
      await wait(700);
    }
    await shot("04_offers");
    step("F02 tres ofertas registradas");
    await clickText("Comparar 3 ofertas");
    await wait(1300);
    await shot("05_compare");
    await clickText("Generar propuesta comercial");
    await clickText("Enviar al cliente");
    await clickText("Registrar aceptación");
    await wait(800);
    step("F03 propuesta enviada y aceptación registrada");

    // Operaciones registra póliza
    await login({ name: "Felipe Cardona" });
    await page.goto(BASE + caseHref + "/cotizacion", { waitUntil: "networkidle0" });
    await wait(800);
    await clickText("Registrar y validar póliza");
    await wait(1000);
    await shot("06_policy");
    const polOk = await page.evaluate(() => document.body.innerText.includes("registrada"));
    step("F03 póliza registrada y validada: " + polOk);
    await clickText("Ver póliza, cartera y comisión");
    await wait(5000);
    await shot("07_policy_detail");
    const hasCommission = await page.evaluate(() => document.body.innerText.includes("Comisión") && document.body.innerText.includes("Cartera de la póliza"));
    step("F04 póliza con cartera y comisión: " + hasCommission);

    // F09 supervisor aprueba solicitud de emisión
    await login({ name: "Sebastián Mora" });
    await page.goto(BASE + "/ia/supervision", { waitUntil: "networkidle0", timeout: 120000 }); await wait(1500);
    await wait(600);
    const pendingBefore = await page.evaluate(() => document.querySelectorAll("button").length);
    await clickText("Aprobar", "button");
    await wait(800);
    await shot("08_supervision");
    step("F09 supervisor aprobó acción IA sensible");

    // Portal del cliente
    await login({ name: "Camilo Herrera" });
    await wait(800);
    await clickText("Quiero hablar con un asesor");
    await wait(800);
    await shot("09_portal");
    const transferred = await page.evaluate(() => document.body.innerText.includes("Transferido a asesor humano"));
    step("Portal: cliente pidió asesor humano → transferido: " + transferred);

    // F08 aislamiento: usuario de Andes intenta abrir caso de Gran Seguros
    await login({ tenant: "Andes Corredores", name: "Mariana Paredes" });
    await page.goto(BASE + "/casos/k_3", { waitUntil: "networkidle0" });
    await wait(800);
    const denied = await page.evaluate(() => document.body.innerText.includes("pertenece a otra empresa"));
    await shot("10_isolation");
    step("F08 acceso a caso de otra empresa bloqueado: " + denied);
  } catch (e) {
    console.log("✘ FALLO:", e.message);
    await shot("99_fail");
  }
  console.log("\nErrores de consola:", errors.length);
  errors.slice(0, 20).forEach((e) => console.log(e));
  await browser.close();
})();
