const puppeteer = require("puppeteer-core");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message, "\n", (e.stack || "").split("\n").slice(0, 8).join("\n")));
  page.on("console", (m) => m.type() === "error" && console.log("[console]", m.text().slice(0, 600)));
  const B = "http://localhost:3361";
  await page.goto(B + "/login", { waitUntil: "networkidle0", timeout: 120000 });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("gc360-session-v1", JSON.stringify({ state: { userId: "u_ase1", tenantId: "t_gran" }, version: 0 })); });
  await page.goto(B + "/bandeja", { waitUntil: "networkidle0", timeout: 120000 });
  await wait(2000);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Simular entrada")).click());
  await wait(500);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Cotizar vehículo")).click());
  await wait(3000);
  console.log("body:", (await page.evaluate(() => document.body.innerText)).slice(0, 200));
  await browser.close();
})();
