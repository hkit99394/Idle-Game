import { buildStaticGameData, type StaticGameDataParts } from "../core/data";
import assignments from "./assignments.json" with { type: "json" };
import enemies from "./enemies.json" with { type: "json" };
import equipment from "./equipment.json" with { type: "json" };
import equipmentSets from "./equipmentSets.json" with { type: "json" };
import formations from "./formations.json" with { type: "json" };
import heroes from "./heroes.json" with { type: "json" };
import mastery from "./mastery.json" with { type: "json" };
import medicines from "./medicines.json" with { type: "json" };
import regions from "./regions.json" with { type: "json" };
import skillUpgrades from "./skillUpgrades.json" with { type: "json" };
import skills from "./skills.json" with { type: "json" };
import stages from "./stages.json" with { type: "json" };
import statusEffects from "./statusEffects.json" with { type: "json" };
import styles from "./styles.json" with { type: "json" };
import upgrades from "./upgrades.json" with { type: "json" };

export const staticGameDataParts = {
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
} satisfies StaticGameDataParts;

export const staticGameData = buildStaticGameData(staticGameDataParts);
