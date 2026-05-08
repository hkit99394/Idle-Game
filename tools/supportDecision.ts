import {
  buildSupportIdentityDecisionReport,
  formatSupportIdentityDecisionReport
} from "../core";
import { createSupportIdentityDecisionInput } from "./fixtures/supportIdentityPrototypes";
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
import type { StaticGameData } from "../core";

const staticData: StaticGameData = {
  assignments: assignments as StaticGameData["assignments"],
  heroes: heroes as StaticGameData["heroes"],
  skills: skills as StaticGameData["skills"],
  enemies: enemies as StaticGameData["enemies"],
  equipment: equipment as StaticGameData["equipment"],
  equipmentSets: equipmentSets as StaticGameData["equipmentSets"],
  regions: regions as StaticGameData["regions"],
  stages: stages as StaticGameData["stages"],
  upgrades: upgrades as StaticGameData["upgrades"],
  skillUpgrades: skillUpgrades as StaticGameData["skillUpgrades"],
  mastery: mastery as StaticGameData["mastery"],
  formations: formations as StaticGameData["formations"],
  styles: styles as StaticGameData["styles"],
  statusEffects: statusEffects as StaticGameData["statusEffects"],
  medicines: medicines as StaticGameData["medicines"]
};

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
