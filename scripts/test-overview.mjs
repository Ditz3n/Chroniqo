// scripts/test-overview.mjs

/*
 * This script runs the test suite and provides an overview of the test results,
 * including the number of test suites that passed in each category and a summary of the test results.
 *
 * Usage: node scripts/test-overview.mjs
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  ["jest", "--coverage", "--coverageReporters=text-summary"],
  {
    encoding: "utf8",
    shell: true,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  },
);

const output = `${result.stdout || ""}${result.stderr || ""}`;
const lines = output.split(/\r?\n/).filter(Boolean);

console.log("Command: npx jest --coverage --coverageReporters=text-summary");
console.log("");

const labelMap = {
  api: "API",
  services: "Services",
  utils: "Utils",
  middleware: "Middleware",
  root: "Root",
};

const passFiles = lines
  .filter((line) => /^\s*PASS\s+/.test(line))
  .map((line) => line.replace(/^\s*PASS\s+/, ""));

const groups = passFiles.reduce((accumulator, filePath) => {
  const match = filePath.match(/^__tests__\/([^/]+)/);
  const key = match ? match[1] : "root";
  accumulator[key] = (accumulator[key] || 0) + 1;
  return accumulator;
}, {});

Object.entries(groups)
  .sort((left, right) => right[1] - left[1])
  .forEach(([key, count]) => {
    console.log(`${labelMap[key] || key}: ${count} suites`);
  });

console.log("");

lines
  .filter((line) =>
    /^Test Suites:|^Tests:|^Snapshots:|^Time:|^Ran all test suites\./.test(
      line,
    ),
  )
  .forEach((line) => console.log(line));

const coverageMetrics = ["Statements", "Branches", "Functions", "Lines"];
const metricLines = coverageMetrics
  .map((metric) =>
    lines.find((line) => new RegExp(`^\\s*${metric}\\s*:`).test(line)),
  )
  .filter(Boolean);

if (metricLines.length > 0) {
  console.log("");
  console.log("Test Coverage (Jest --coverage text-summary):");
  metricLines.forEach((line) => {
    const match = line.match(/(\w+)\s*:\s*([0-9.]+%)\s*\(\s*(\d+)\/(\d+)\s*\)/);
    if (match) {
      console.log(`  ${match[1]}: ${match[2]} (${match[3]}/${match[4]})`);
    }
  });
}

process.exit(result.status ?? 0);
