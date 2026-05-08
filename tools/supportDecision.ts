import {
  buildSupportIdentityDecisionReport,
  formatSupportIdentityDecisionReport
} from "./supportDecision/decision";
import { createSupportIdentityDecisionInput } from "./fixtures/supportIdentityPrototypes";
import { staticData } from "./staticData";

const decisionInput = createSupportIdentityDecisionInput(staticData);
const report = buildSupportIdentityDecisionReport(
  decisionInput.data,
  decisionInput.options
);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatSupportIdentityDecisionReport(report));
}
