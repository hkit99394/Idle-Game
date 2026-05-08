import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildBalanceReport,
  buildSupportIdentityDecisionReport
} from "../../core";
import type { StaticGameData } from "../../core";
import assignments from "../../data/assignments.json" with { type: "json" };
import enemies from "../../data/enemies.json" with { type: "json" };
import equipment from "../../data/equipment.json" with { type: "json" };
import equipmentSets from "../../data/equipmentSets.json" with { type: "json" };
import formations from "../../data/formations.json" with { type: "json" };
import heroes from "../../data/heroes.json" with { type: "json" };
import mastery from "../../data/mastery.json" with { type: "json" };
import medicines from "../../data/medicines.json" with { type: "json" };
import regions from "../../data/regions.json" with { type: "json" };
import skillUpgrades from "../../data/skillUpgrades.json" with { type: "json" };
import skills from "../../data/skills.json" with { type: "json" };
import stages from "../../data/stages.json" with { type: "json" };
import statusEffects from "../../data/statusEffects.json" with { type: "json" };
import styles from "../../data/styles.json" with { type: "json" };
import upgrades from "../../data/upgrades.json" with { type: "json" };

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

describe("support identity decision", () => {
  it("runs prototype support options without changing production static data", () => {
    const heroIdsBefore = staticData.heroes.map((hero) => hero.id);
    const skillIdsBefore = staticData.skills.map((skill) => skill.id);
    const report = buildSupportIdentityDecisionReport(staticData);

    expect(staticData.heroes.map((hero) => hero.id)).toEqual(heroIdsBefore);
    expect(staticData.skills.map((skill) => skill.id)).toEqual(skillIdsBefore);
    expect(heroIdsBefore).not.toContain("prototype_lotus_purity_adept");
    expect(skillIdsBefore).not.toContain("prototype_lotus_purifying_staff");
    expect(report.options.map((option) => option.optionId)).toEqual([
      "lotus_support",
      "new_support_hero",
      "temporary_manual"
    ]);
  });

  it("selects Lotus support using scenario metrics", () => {
    const report = buildSupportIdentityDecisionReport(staticData);
    const lotus = getOption(report, "lotus_support");
    const newHero = getOption(report, "new_support_hero");
    const manual = getOption(report, "temporary_manual");

    expect(report.selectedOptionId).toBe("lotus_support");
    expect(lotus.productionRosterChangeRequired).toBe(false);
    expect(newHero.productionRosterChangeRequired).toBe(true);
    expect(lotus.supportContribution).toMatchObject({
      label: "Lotus Purity Training",
      statusResistanceBonus: 0.08
    });
    expect(lotus.supportContribution?.estimatedCpContribution).toBeGreaterThan(0);
    expect(lotus.estimatedTeamCp).toBeGreaterThan(0);
    expect(newHero.estimatedTeamCp).toBeGreaterThan(lotus.estimatedTeamCp);
    expect(manual.demonCultBoss.statusDamage).toBeLessThan(
      report.defaultCombinedGate.statusDamage
    );
    expect(lotus.demonCultBoss.statusDurationSeconds).toBeLessThan(
      report.defaultCombinedGate.statusDurationSeconds
    );
    expect(lotus.demonCultBoss.survivalRatio).toBeGreaterThan(
      report.defaultCombinedGate.survivalRatio
    );
    expect(lotus.demonCultBoss.medicineConsumed).toBe(
      report.defaultCombinedGate.medicineConsumed
    );
    expect(report.decision).toContain("do not add a new production hero yet");
  });

  it("keeps the default balance report free of prototype heroes", () => {
    const report = buildBalanceReport(staticData);

    expect(JSON.stringify(report)).not.toContain("prototype_lotus_purity_adept");
    expect(JSON.stringify(report)).not.toContain(
      "prototype_lotus_purifying_staff"
    );
  });

  it("documents the decision with simulator evidence", () => {
    const doc = readFileSync("docs/archive/stage-1.5-backlog.md", "utf8");

    expect(doc).toContain("Support Identity Decision Record");
    expect(doc).toContain("survival ratio");
    expect(doc).toContain("status damage");
    expect(doc).toContain("medicine");
  });
});

function getOption(
  report: ReturnType<typeof buildSupportIdentityDecisionReport>,
  optionId: string
) {
  const option = report.options.find((candidate) => candidate.optionId === optionId);

  if (option === undefined) {
    throw new Error(`Missing support decision option ${optionId}`);
  }

  return option;
}
