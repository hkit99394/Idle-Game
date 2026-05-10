import { buildStaticGameData } from "../core";
import assignments from "../data/assignments.json" with { type: "json" };
import enemies from "../data/enemies.json" with { type: "json" };
import equipment from "../data/equipment.json" with { type: "json" };
import equipmentSets from "../data/equipmentSets.json" with { type: "json" };
import formations from "../data/formations.json" with { type: "json" };
import heroes from "../data/heroes.json" with { type: "json" };
import mastery from "../data/mastery.json" with { type: "json" };
import medicines from "../data/medicines.json" with { type: "json" };
import regions from "../data/regions.json" with { type: "json" };
import skillUpgrades from "../data/skillUpgrades.json" with { type: "json" };
import skills from "../data/skills.json" with { type: "json" };
import stages from "../data/stages.json" with { type: "json" };
import statusEffects from "../data/statusEffects.json" with { type: "json" };
import styles from "../data/styles.json" with { type: "json" };
import upgrades from "../data/upgrades.json" with { type: "json" };
import {
  buildGameBalanceReport,
  formatBalanceReport
} from "./balanceReport";

const staticData = buildStaticGameData({
  assignments,
  heroes,
  skills,
  enemies,
  equipment,
  equipmentSets,
  regions,
  stages,
  upgrades,
  skillUpgrades,
  mastery,
  formations,
  styles,
  statusEffects,
  medicines
});

const report = buildGameBalanceReport(staticData);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatBalanceReport(report));
}
