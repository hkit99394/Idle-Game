export type AssignmentHeroOptionView = {
  heroId: string;
  name: string;
  style: string;
  role: string;
  eligible: boolean;
  assignedHere: boolean;
  assignedAssignmentName: string | null;
};

export type AssignmentView = {
  assignmentId: string;
  name: string;
  type: "patrol" | "training_ground";
  durationBucket: string;
  unlocked: boolean;
  lockReason: string | null;
  assignedHeroIds: string[];
  rewardSummary: string[];
  heroOptions: AssignmentHeroOptionView[];
};
