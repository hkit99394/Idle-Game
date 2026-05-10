import type {
  EquipHeroEquipmentResult,
  FormationSlot,
  OfflineFarmPreset,
  PlayerProgress,
  PreBattleResistanceMode,
  PurchaseSkillUpgradeResult,
  PurchaseUpgradeResult,
  ResolveStageBattleResult,
  SelectStyleBranchResult,
  SetActiveHeroTeamResult,
  SetAssignmentHeroesResult
} from "../../core";
import type { WebGameState } from "./types";

export type StageIdleAction =
  | {
      type: "select_stage";
      stageId: string;
    }
  | {
      type: "select_offline_farm_stage";
      stageId: string | null;
    }
  | {
      type: "set_offline_farm_preset";
      preset: OfflineFarmPreset;
    }
  | {
      type: "battle_resolved";
      stageId: string;
      result: ResolveStageBattleResult;
    }
  | {
      type: "dismiss_offline_summary";
    };

export type ProgressionAction =
  | {
      type: "purchase_resolved";
      result: PurchaseUpgradeResult;
    }
  | {
      type: "skill_purchase_resolved";
      result: PurchaseSkillUpgradeResult;
    }
  | {
      type: "style_branch_select_resolved";
      result: SelectStyleBranchResult;
    };

export type EquipmentAction = {
  type: "equipment_equip_resolved";
  result: EquipHeroEquipmentResult;
};

export type RosterFormationAction =
  | {
      type: "set_hero_formation_slot";
      heroId: string;
      slot: FormationSlot;
    }
  | {
      type: "active_team_update_resolved";
      result: SetActiveHeroTeamResult;
    };

export type AssignmentAction = {
  type: "assignment_update_resolved";
  result: SetAssignmentHeroesResult;
};

export type CounterplayAction =
  | {
      type: "set_auto_medicine_enabled";
      enabled: boolean;
    }
  | {
      type: "set_medicine_auto_use";
      medicineId: string;
      enabled: boolean;
    }
  | {
      type: "set_pre_battle_resistance_mode";
      mode: PreBattleResistanceMode;
    };

export type SaveStateAction =
  | {
      type: "replace_progress";
      progress: PlayerProgress;
    }
  | {
      type: "replace_state";
      state: WebGameState;
    };

export type WebGameAction =
  | StageIdleAction
  | ProgressionAction
  | EquipmentAction
  | RosterFormationAction
  | AssignmentAction
  | CounterplayAction
  | SaveStateAction;

export const webGameActionTypeDomains = {
  active_team_update_resolved: "roster_formation",
  assignment_update_resolved: "assignments",
  battle_resolved: "stage_idle",
  dismiss_offline_summary: "stage_idle",
  equipment_equip_resolved: "equipment",
  purchase_resolved: "progression",
  replace_progress: "save_state",
  replace_state: "save_state",
  select_offline_farm_stage: "stage_idle",
  select_stage: "stage_idle",
  set_auto_medicine_enabled: "counterplay",
  set_hero_formation_slot: "roster_formation",
  set_medicine_auto_use: "counterplay",
  set_offline_farm_preset: "stage_idle",
  set_pre_battle_resistance_mode: "counterplay",
  skill_purchase_resolved: "progression",
  style_branch_select_resolved: "progression"
} as const satisfies Record<WebGameAction["type"], string>;

export type WebGameActionDomain =
  (typeof webGameActionTypeDomains)[WebGameAction["type"]];

function createActionDomainTypes(): Record<
  WebGameActionDomain,
  WebGameAction["type"][]
> {
  const domainTypes: Record<WebGameActionDomain, WebGameAction["type"][]> = {
    assignments: [],
    counterplay: [],
    equipment: [],
    progression: [],
    roster_formation: [],
    save_state: [],
    stage_idle: []
  };

  for (const [type, domain] of Object.entries(webGameActionTypeDomains)) {
    domainTypes[domain as WebGameActionDomain].push(
      type as WebGameAction["type"]
    );
  }

  return domainTypes;
}

export const webGameActionDomainTypes = createActionDomainTypes();
