// Renders guide.html to the buyer PDF with headless Chromium.
//   node product/tutorial/make_pdf.js "<output.pdf>"
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const out = process.argv[2] || path.join(__dirname, "guide.pdf");
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
  const page = await browser.newPage();
  await page.goto("file://" + path.join(__dirname, "guide.html"), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log(out);
})();
