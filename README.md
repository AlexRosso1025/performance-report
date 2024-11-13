# Lighthouse Performance Report with Puppeteer and ExcelJS

This project automates Lighthouse audits on specified URLs and stores the resulting performance data in an Excel file. Additionally, it generates visual charts to track metrics over time.

## Features

- Automated Lighthouse audits using Puppeteer.
- Saves audit results for performance, accessibility, best practices, and SEO to an Excel file.
- Supports tracking and visualization of metrics over time.
- Generates charts based on data from previous audits.

## Prerequisites

- **Node.js** (version 14 or higher)
- **npm** (Node Package Manager)
- **Google Chrome** (Lighthouse and Puppeteer use Chrome to perform audits)
- **Environment Variables**:
  - `URL`: The target URL for the audit.
  - `COMPONENT`: Identifier for the component (used in Excel filename).
  - `VTEX_ID_CLIENT_AUT_COOKIE`: Authentication cookie for VTEX.

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create a .env file in the project root with the following environment variables:
   ```bash
   URL=<target-url>
   COMPONENT=<component-name>
   VTEX_ID_CLIENT_AUT_COOKIE=<authentication-cookie>
   ```

## Usage

Run the script by executing:
```bash
node --env.file.env <script-name>.js
```

This will:

* Perform a Lighthouse audit on the specified URL.
* Store the data in an Excel file named lighthouse-report-<component>.xlsx.
* Generate a visual chart in lighthouse-report-<component>.png.

## Project Structure

* app.js: Main entry file that initiates the Lighthouse audit and handles data storage and visualization.

* ### Fuctions:
    * setupBrowser(url): Sets up Puppeteer with a new browser and page.
    * getLighthouseData(url): Runs the Lighthouse audit and retrieves key metrics.
    * saveDataToExcel(data, component): Saves audit data to an Excel file.
    * readDataFromExcel(component): Reads audit data from the Excel file.
    * generateChartImage(data, component): Generates a chart image showing metric changes over time.

* ### Dependencies:
    * Lighthouse: For running audits.
    * Puppeteer: For managing the browser instance.
    * ExcelJS: For creating and reading Excel files.
    * Chart.js (loaded via CDN): For generating charts in the browser.

## Example

The following example assumes the following .env file:

```bash
URL=https://www.example.myvex.com
COMPONENT=example
VTEX_ID_CLIENT_AUT_COOKIE=your-auth-cookie
```

Running the script will create:
* An Excel file named lighthouse-report-example.xlsx with audit results.
* A PNG image file named lighthouse-report-example.png with a line chart of the metrics.

## Error Handling
* Excel file errors: Logs errors encountered during file creation or reading.
* Browser launch errors: Ensures browser instance closes even on audit failure.

## Troubleshooting
* Authentication: Ensure the VTEX_ID_CLIENT_AUT_COOKIE is valid and correctly set in .env.
* Permissions: The script may need elevated permissions to create or modify files in the project directory.
* ExcelJS Compatibility: If issues occur with ExcelJS, ensure the version specified in package.json is compatible.

## License
This project is licensed under the MIT License.