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
async function getLighthouseData(url, metricsType) {
  const audits = metricsType === "core"
    ? ["performance", "accessibility", "best-practices", "seo"]
    : ["first-contentful-paint", "largest-contentful-paint", "speed-index", "total-blocking-time", "cumulative-layout-shift"];

  const { lhr } = await lighthouse(url, {
    port: 9222,
    output: ["json", "html"],
    onlyCategories: ["performance", "accessibility", "best-practices", "seo", "pwa"],
    onlyAudits: audits,
  });
  
  return {
    timestamp: new Date().toLocaleString(),
    performance: lhr.categories.performance.score * 100,
    accessibility: lhr.categories.accessibility.score * 100,
    bestPractices: lhr.categories["best-practices"].score * 100,
    seo: lhr.categories.seo.score * 100,
    firstContentfulPaint: parseTime(lhr.audits["first-contentful-paint"].displayValue),
    largestContentfulPaint: parseTime(lhr.audits["largest-contentful-paint"].displayValue),
    speedIndex: parseTime(lhr.audits["speed-index"].displayValue),
    totalBlockingTime: parseTime(lhr.audits["total-blocking-time"].displayValue),
    cumulativeLayoutShift: parseFloat(lhr.audits["cumulative-layout-shift"].displayValue),
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
    { header: "First Contentful Paint", key: "firstContentfulPaint", width: 20},
    { header: "Largest Contentful Paint", key: "largestContentfulPaint", width: 20},
    { header: "Speed Index", key: "speedIndex", width: 20},
    { header: "Total Blocking Time", key: "totalBlockingTime", width: 20},
    { header: "Cumulative Layout Shift", key: "cumulativeLayoutShift", width: 20},
  ];

  worksheet.addRow(data);
  await workbook.xlsx.writeFile(fileName);
  console.log("Data added to the Excel file:", fileName);
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
          firstContentfulPaint: row.getCell("F").value,
          largestContentfulPaint: row.getCell("G").value,
          speedIndex: row.getCell("H").value,
          totalBlockingTime: row.getCell("I").value,
          cumulativeLayoutShift: row.getCell("J").value,
        });
      }
    });
  } else {
    console.log("The file doesn't exist.");
  }

  return data;
}

// Función para generar el gráfico en base a los datos
async function generateChartImage(data, component,metricsType) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("about:blank", { waitUntil: "networkidle0" });
  await page.addScriptTag({ url: "https://cdn.jsdelivr.net/npm/chart.js" });
  await page.waitForFunction(() => typeof Chart !== "undefined");

  let metricsConfig = {};
  if(metricsType === "general"){
    metricsConfig = {
      fields: ["performance","accessibility","bestPractices","seo"],
      colors: ["rgb(75, 192, 192)", "rgb(0, 51, 51)", "rgb(153, 204, 0)", "rgb(51, 0, 0)"],
      averagesText: (averages) =>
        `Averages: Performance: ${averages.performance} | Accessibility: ${averages.accessibility} | Best Practices: ${averages.bestPractices} | SEO: ${averages.seo}`,
    };
  } else if(metricsType === "performance"){
    metricsConfig = {
      fields: ["firstContentfulPaint", "largestContentfulPaint", "speedIndex", "totalBlockingTime", "cumulativeLayoutShift"],
      colors: ["rgb(255, 128, 0)", "rgb(51, 51, 255)", "rgb(255, 102, 255)", "rgb(0, 0, 0)", "rgb(51, 255, 255)"],
      averagesText: (averages) =>
        `Averages: FCP: ${averages.firstContentfulPaint} | LCP: ${averages.largestContentfulPaint} | Speed Index: ${averages.speedIndex} | TBT: ${averages.totalBlockingTime} | CLS: ${averages.cumulativeLayoutShift}`,
    };
  }

  const averages = metricsConfig.fields.reduce((acc, field) => {
    acc[field] = (data.reduce((sum, item) => sum + item[field], 0) / data.length).toFixed(2);
    return acc;
  }, {});

  const chartConfig = {
    type: "line",
    data: {
      labels: data.map((item) => item.timestamp),
      datasets: metricsConfig.fields.map((field, index) => ({
        label: field.charAt(0).toUpperCase() + field.slice(1),
        data: data.map((item) => item[field]),
        borderColor: metricsConfig.colors[index],
        fill: false,
      })),
    },
    options: {
      plugins: {
        subtitle: {
          display: true,
          text: metricsConfig.averagesText(averages),
        },
        legend: {
          display: true,
          position: "right",
        },
      },
    },
  };

  await page.evaluate((chartConfig) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 600;
    document.body.appendChild(canvas);
    new Chart(canvas.getContext("2d"), chartConfig);
  }, chartConfig);

  // Guardar el gráfico en un archivo de imagen
  await page.screenshot({ path: `lighthouse-report-${component}-${metricsType}.png`, fullPage: true });
  await browser.close();
}

function parseTime(value) {
  if (value.endsWith('ms')) {
    return parseFloat(value.replace('ms', '').replace(',', '.')); 
  } else if (value.endsWith('s')) {
    return parseFloat(value.replace('s', '')) * 1000;
  } else {
    return parseFloat(value); // Default case
  }
}

// Función principal para ejecutar el flujo completo
async function runLighthouseWorkflow(url) {
  const component = process.env.COMPONENT;
  const { browser } = await setupBrowser(url);

  for (let i = 0; i < 5; i++) {
    const lighthouseData = await getLighthouseData(url);
    await saveDataToExcel(lighthouseData, component);
    
    console.log(`Awaiting 3 minutes before the next execution: ${i+1} of 5`);
    await new Promise((resolve) => setTimeout(resolve, 3 * 60 * 1000));
  }

  const excelData = await readDataFromExcel(component);
  
  await generateChartImage(excelData, component, "general");
  await generateChartImage(excelData, component, "performance");
  await browser.close();
}

// Ejecuta el flujo completo para una URL específica
runLighthouseWorkflow(process.env.URL);