import {
  buildBalanceAuthoringExport,
  buildGameBalanceReport,
  buildTacticComparisonExport,
  buildTacticComparisonReport,
  formatBalanceStageExportCsv,
  formatTacticComparisonCsv,
  formatBalanceReport
} from "./balanceReport";
import { staticData } from "./staticData";

const args = process.argv.slice(2);

if (args.includes("--tactics-json")) {
  console.log(
    JSON.stringify(
      buildTacticComparisonExport(buildTacticComparisonReport(staticData)),
      null,
      2
    )
  );
} else if (args.includes("--tactics-csv")) {
  console.log(
    formatTacticComparisonCsv(buildTacticComparisonReport(staticData))
  );
} else {
  const report = buildGameBalanceReport(staticData);

  if (args.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else if (args.includes("--export-json")) {
    console.log(JSON.stringify(buildBalanceAuthoringExport(report), null, 2));
  } else if (args.includes("--csv") || args.includes("--export-csv")) {
    console.log(formatBalanceStageExportCsv(report));
  } else {
    console.log(formatBalanceReport(report));
  }
}
