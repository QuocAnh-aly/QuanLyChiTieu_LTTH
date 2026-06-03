// ──────────────────────────────────────────────────────────────────────────
// Savings goal grouping (frontend-only).
//
// The backend stores each savings goal as a single-level Budget row. To support
// a "parent goal (mục tiêu chung) → sub-goals (mục tiêu nhỏ)" hierarchy without
// a schema change, the parent name is encoded into the Budget Title using a
// separator:  "<Mục tiêu chung> :: <Mục tiêu nhỏ>".
//
// A goal whose title has no separator is treated as a standalone goal whose
// parent group is the title itself (a group of one).
// ──────────────────────────────────────────────────────────────────────────

export const GROUP_SEP = " :: ";

// Split a stored Budget title into { group, name }.
export function splitTitle(title) {
  const raw = (title ?? "").trim();
  const idx = raw.indexOf(GROUP_SEP);
  if (idx === -1) return { group: raw, name: raw, standalone: true };
  return {
    group: raw.slice(0, idx).trim(),
    name: raw.slice(idx + GROUP_SEP.length).trim(),
    standalone: false,
  };
}

// Build a stored Budget title from a parent group + sub-goal name.
export function joinTitle(group, name) {
  const g = (group ?? "").trim();
  const n = (name ?? "").trim();
  if (!g || g === n) return n;
  return `${g}${GROUP_SEP}${n}`;
}

// Group a flat list of mapped goals (each having .saved, .target, .name, .title)
// into parent groups. Returns an array of:
//   { group, goals: [...], saved, target, leftToSave, pct, done }
// preserving first-seen order of groups.
export function groupGoals(goals) {
  const order = [];
  const byGroup = new Map();

  for (const g of goals) {
    const { group, name } = splitTitle(g.title ?? g.name);
    if (!byGroup.has(group)) {
      byGroup.set(group, []);
      order.push(group);
    }
    byGroup.get(group).push({ ...g, subName: name, group });
  }

  return order.map((group) => {
    const items = byGroup.get(group);
    const saved = items.reduce((s, x) => s + (x.saved ?? 0), 0);
    const target = items.reduce((s, x) => s + (x.target ?? 0), 0);
    const leftToSave = Math.max(0, target - saved);
    const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
    return {
      group,
      goals: items,
      saved,
      target,
      leftToSave,
      pct,
      done: target > 0 && saved >= target,
    };
  });
}
