export const districtAttentionBoundaryTokens = [
  "District Heat",
  "districtHeat",
  "districtHeatProjection",
  "districtHeatPromotionDecision",
  "projectedHeat",
  "heatBand",
  "district attention",
  "District attention",
  "districtAttention",
  "district-attention",
  "districtAttentionWarning",
  "attentionWarning",
  "Attention rising",
  "Repeated runs are drawing district attention",
  "Informational only."
] as const;

export function findDistrictAttentionBoundaryTokens(value: unknown): string[] {
  const text = typeof value === "string" ? value : JSON.stringify(value);

  return districtAttentionBoundaryTokens.filter((token) =>
    text.includes(token)
  );
}
