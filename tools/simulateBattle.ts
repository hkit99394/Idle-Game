import {
  buildGameBalanceReport,
  formatBalanceReport
} from "./balanceReport";
import { staticData } from "./staticData";

const report = buildGameBalanceReport(staticData);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatBalanceReport(report));
}
