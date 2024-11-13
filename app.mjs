import lighthouse from "lighthouse";
import puppeteer from "puppeteer";
import fs from "fs";
import ExcelJS from "exceljs";

// Función para lanzar Puppeteer con una página y URL específicas
async function setupBrowser(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--remote-debugging-port=9222"],
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Configurar cookie para autenticación en VTEX
  await page.setCookie({
    name: "VtexIdclientAutCookie",
    value: process.env.VTEX_ID_CLIENT_AUT_COOKIE,
    domain: new URL(url).hostname,
  });
  
  return { browser, page };
}

// Función para ejecutar Lighthouse y obtener los datos necesarios
async function getLighthouseData(url) {
  const { lhr } = await lighthouse(url, {
    port: 9222,
    output: ["json", "html"],
    onlyCategories: ["performance", "accessibility", "best-practices", "seo", "pwa"],
  });
  
  return {
    timestamp: new Date().toLocaleString(),
    performance: lhr.categories.performance.score * 100,
    accessibility: lhr.categories.accessibility.score * 100,
    bestPractices: lhr.categories["best-practices"].score * 100,
    seo: lhr.categories.seo.score * 100,
  };
}

// Función para crear o actualizar el archivo Excel
async function saveDataToExcel(data, component) {
  const fileName = `lighthouse-report-${component}.xlsx`;
  const workbook = new ExcelJS.Workbook();
  let worksheet;

  if (fs.existsSync(fileName)) {
    await workbook.xlsx.readFile(fileName);
    worksheet = workbook.getWorksheet("Lighthouse Report") || workbook.addWorksheet("Lighthouse Report");
  } else {
    worksheet = workbook.addWorksheet("Lighthouse Report");
  }

  worksheet.columns = [
    { header: "Timestamp", key: "timestamp", width: 20 },
    { header: "Performance", key: "performance", width: 20 },
    { header: "Accessibility", key: "accessibility", width: 20 },
    { header: "Best Practices", key: "bestPractices", width: 20 },
    { header: "SEO", key: "seo", width: 20 },
  ];

  worksheet.addRow(data);
  await workbook.xlsx.writeFile(fileName);
  console.log("Datos añadidos al archivo Excel:", fileName);
}

// Función para leer datos desde Excel
async function readDataFromExcel(component) {
  const fileName = `lighthouse-report-${component}.xlsx`;
  const workbook = new ExcelJS.Workbook();
  const data = [];

  if (fs.existsSync(fileName)) {
    await workbook.xlsx.readFile(fileName);
    const worksheet = workbook.getWorksheet("Lighthouse Report");

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        data.push({
          timestamp: row.getCell("A").value,
          performance: row.getCell("B").value,
          accessibility: row.getCell("C").value,
          bestPractices: row.getCell("D").value,
          seo: row.getCell("E").value,
        });
      }
    });
  } else {
    console.log("El archivo no existe.");
  }

  return data;
}

// Función para generar el gráfico en base a los datos
async function generateChartImage(data, component) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("about:blank", { waitUntil: "networkidle0" });
  await page.addScriptTag({ url: "https://cdn.jsdelivr.net/npm/chart.js" });
  await page.waitForFunction(() => typeof Chart !== "undefined");

  const chartConfig = {
    type: "line",
    data: {
      labels: data.map((item) => item.timestamp),
      datasets: [
        { label: "Performance", data: data.map((item) => item.performance), borderColor: "rgb(75, 192, 192)", fill: false },
        { label: "Accessibility", data: data.map((item) => item.accessibility), borderColor: "rgb(0, 51, 51)", fill: false },
        { label: "Best Practices", data: data.map((item) => item.bestPractices), borderColor: "rgb(153, 204, 0)", fill: false },
        { label: "SEO", data: data.map((item) => item.seo), borderColor: "rgb(51, 0, 0)", fill: false },
      ],
    },
  };

  await page.evaluate((chartConfig) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);
    new Chart(canvas.getContext("2d"), chartConfig);
  }, chartConfig);

  await page.screenshot({ path: `lighthouse-report-${component}.png`, fullPage: true });
  await browser.close();
}

// Función principal para ejecutar el flujo completo
async function runLighthouseWorkflow(url) {
  const component = process.env.COMPONENT;
  const { browser } = await setupBrowser(url);

  const lighthouseData = await getLighthouseData(url);
  await saveDataToExcel(lighthouseData, component);

  const excelData = await readDataFromExcel(component);
  await generateChartImage(excelData, component);

  await browser.close();
}

// Ejecuta el flujo completo para una URL específica
runLighthouseWorkflow(process.env.URL);