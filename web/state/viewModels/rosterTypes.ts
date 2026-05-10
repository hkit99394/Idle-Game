import type { CombatRole, FormationSlot } from "../../../core";

export type RosterHeroView = {
  heroId: string;
  name: string;
  style: string;
  role: string;
  combatRole: CombatRole;
  level: number;
  combatPower: number;
  unlocked: boolean;
  active: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  lockReason: string | null;
  assignedAssignmentName: string | null;
};

export type PlayerFormationHeroView = {
  heroId: string;
  name: string;
  style: string;
  role: string;
  combatRole: CombatRole;
  formationSlot: FormationSlot;
};
