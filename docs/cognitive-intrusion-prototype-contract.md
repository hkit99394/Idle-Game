# Cognitive Intrusion Prototype Contract

## Decision

Stage 2.3 selects **Cognitive Intrusion** as the first neon-native gameplay prototype.

The prototype should make Cognitive Art feel like hostile system pressure, not only renamed Inner damage. It should reuse the existing combat loop: Context Stability, AI Overload, data-driven statuses, target priorities, battle summaries, and simulator reports.

## Candidate Comparison

| Candidate | Fit | Save Risk | Implementation Footprint | Decision |
| --- | --- | --- | --- | --- |
| Cognitive Intrusion | Strongest Path of Neon proof; directly enriches Context Stability and AI Overload. | Low. Battle status state is transient and old saves do not need new fields. | Small combat/status schema extension plus static content and focused tests. | Selected. |
| District Heat | Strong route identity and likely second-best system. | Medium/high. Needs persisted district pressure or derived decay rules. | Touches offline farms, operations, rewards, region UI, and balance pacing. | Defer second. |
| Augment Loadouts | Good gear identity. | Medium. Current equipment is already saved by ids and slots. | Touches inventory, loadout UI, equipment validation, CP, and balance. | Defer. |
| Network Operations | Good idle identity. | Medium. Assignment state and rewards would need new operation semantics. | Touches assignments, offline rewards, hero eligibility, and UI. | Defer. |
| Countermeasure Economy | Good Lotus/Redline counterplay identity. | Medium. Inventory and auto-countermeasure behavior become broader economy work. | Touches medicines, auto policy, status pressure, and resource pacing. | Defer. |
| AI Raid Event | Strong long-term product identity. | High. Requires backend/API event contracts. | Depends on online boss transport and account/cloud assumptions. | Defer. |

## Smallest Useful Slice

Add one live mechanic: **Intrusion** is a Cognitive status that makes a target more vulnerable to Context Stability pressure and slows Context Rebuild long enough to create clearer AI Overload windows.

Recommended first implementation:

- Add a new static status id, `cognitive_intrusion`, with display name **Intrusion**.
- Add a status effect modifier for Cognitive damage taken, for example `innerDamageTakenMultiplier`, so Intrusion can make Context Stability pressure visibly stronger.
- Keep the existing `innerRecoveryMultiplier` effect available for the same status, but avoid adding more status effect keys in the first slice.
- Attach Intrusion through a narrow player-side upgrade path, preferably Azure Pulse Monk's `meridian_shock_refinement`, so the player can opt into the mechanic through existing Resonance spending.
- Optionally add one hostile Redline or Veil skill application only if the player-side prototype is too invisible in simulator output.

## Affected Systems

- **Core combat:** status modifiers, damage package, status estimation, deterministic `apply_status`, and battle event recording.
- **Static data:** one new status definition and one skill-upgrade or skill effect reference.
- **Validation:** supported status effect keys and missing status references.
- **Web UI:** existing status chips, battle event views, counterplay preview, and battle summaries should surface the new status through current status metadata paths.
- **Simulator and reports:** existing status application, duration, status damage, AI Overload, and tactic comparison rows should show whether Intrusion changed outcomes.

## Save And Compatibility

- No save schema migration is allowed for the prototype.
- Existing saves must load without adapters because the mechanic is driven by static data, purchased skill-upgrade levels, and transient battle status state.
- Do not rename `innerQi`, `innerAttack`, `innerDefense`, `innerRecoveryRate`, `qi_break`, existing status ids, skill ids, tactic ids, or save fields.
- New static ids may use Path of Neon names, but existing ids remain compatibility keys.

## Data Shape

The first implementation should prefer this shape:

```json
{
  "id": "cognitive_intrusion",
  "name": "Intrusion",
  "category": "control",
  "durationSeconds": 6,
  "maxStacks": 1,
  "stackPolicy": "refresh",
  "dispelTags": ["inner", "debuff"],
  "effects": {
    "innerDamageTakenMultiplier": 1.12,
    "innerRecoveryMultiplier": 0.85
  }
}
```

The exact numbers are tuning knobs. The first pass should be small enough that known Black Iron Foundry and Redline budget debt remains visible rather than accidentally retuned away.

## Tests And Reports

Required tests before implementation closure:

- Data validation rejects unsupported status effect keys and accepts `innerDamageTakenMultiplier`.
- Damage package or simulator tests prove Intrusion increases Cognitive damage without changing Kinetic damage.
- Status presentation tests show **Intrusion** through existing status chip and cleanse/purge paths.
- A focused combat/simulator test proves Intrusion can create or accelerate an AI Overload window.
- Save fixture/import tests pass without schema changes.
- `npm run simulate` still reports known Black Iron Foundry and Redline budget debt by stable ids.

Recommended verification:

```sh
npm test -- tests/data/validateData.test.ts tests/combat/statusEffects.test.ts tests/combat/damagePackage.test.ts tests/combat/simulator.test.ts tests/web/statusPresentation.test.ts
npm test
npm run typecheck
npm run build
npm run simulate
git diff --check
```

## Out Of Scope

- District Heat, Trace, Firewall, Calibration Debt, and AI Raid mechanics.
- New save fields, save-version migration, storage-key migration, or internal id migration.
- New equipment slots, augment loadout rules, protocol deck restrictions, or operation reward systems.
- Full Redline retune or broad enemy/content rebalance.
- Backend, cloud-save, or online event work.
