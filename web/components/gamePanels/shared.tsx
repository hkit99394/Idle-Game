import type { ResolveStageBattleResult } from "../../../core";
import type { SaveDiagnosticsView } from "../../state/gameState";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.floor(Math.max(0, seconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${Math.max(1, safeSeconds)}s`;
}

export function formatTimestamp(value: number | null): string {
  if (value === null) {
    return "Not saved";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatSaveStatus(status: SaveDiagnosticsView["status"]): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "missing_save":
      return "Missing save";
    case "invalid_json":
      return "Invalid JSON";
    case "invalid_save":
      return "Invalid save";
    case "storage_error":
      return "Storage error";
    case "storage_unavailable":
      return "Storage unavailable";
  }
}

function getBarPercent(current: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (current / max) * 100));
}

export function getBattleResultText(
  lastBattle: ResolveStageBattleResult | null,
  stageName: string
): string {
  if (!lastBattle) {
    return "Ready";
  }

  if (!lastBattle.ok) {
    switch (lastBattle.reason) {
      case "locked_stage":
        return `${stageName} is locked`;
      case "missing_enemy":
        return "Enemy data missing";
      case "missing_stage":
        return "Stage data missing";
    }
  }

  if (lastBattle.stageCleared) {
    return `Victory - ${stageName} cleared`;
  }

  return lastBattle.battle.winner === "timeout"
    ? `Stalemate - ${stageName} held`
    : `Defeat - ${stageName} held`;
}

export function getBattleResultClass(lastBattle: ResolveStageBattleResult | null): string {
  if (!lastBattle) {
    return "";
  }

  if (!lastBattle.ok) {
    return "blocked";
  }

  if (lastBattle.stageCleared) {
    return "victory";
  }

  return lastBattle.battle.winner === "timeout" ? "stalemate" : "defeat";
}

type BarProps = {
  className: "outer" | "inner";
  label: string;
  current: number;
  max: number;
};

export function StatBar({ className, current, label, max }: BarProps) {
  const width = `${getBarPercent(current, max)}%`;
  const meterValue = Math.round(Math.max(0, Math.min(current, max)));

  return (
    <div className={`stat-bar ${className}-stat`}>
      <div className="bar-label">
        <span>{label}</span>
        <strong>
          {formatNumber(current)} / {formatNumber(max)}
        </strong>
      </div>
      <div
        className={`bar ${className}`}
        role="meter"
        aria-label={`${label} ${formatNumber(current)} of ${formatNumber(max)}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-valuenow={meterValue}
      >
        <span style={{ width }} />
      </div>
    </div>
  );
}

export function formatSignedPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    signDisplay: "always",
    style: "percent"
  }).format(value);
}

export function formatFormationSlot(slot: string): string {
  return `${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
}

export function formatCombatRole(role: string): string {
  return role
    .replace(/[-_]+/g, " ")
    .replace(/^./, (match) => match.toUpperCase());
}
