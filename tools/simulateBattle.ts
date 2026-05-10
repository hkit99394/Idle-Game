import {
  buildBalanceAuthoringExport,
  buildGameBalanceReport,
  formatBalanceStageExportCsv,
  formatBalanceReport
} from "./balanceReport";
import { staticData } from "./staticData";

const report = buildGameBalanceReport(staticData);
const args = process.argv.slice(2);

if (args.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else if (args.includes("--export-json")) {
  console.log(JSON.stringify(buildBalanceAuthoringExport(report), null, 2));
} else if (args.includes("--csv") || args.includes("--export-csv")) {
  console.log(formatBalanceStageExportCsv(report));
} else {
  console.log(formatBalanceReport(report));
}
