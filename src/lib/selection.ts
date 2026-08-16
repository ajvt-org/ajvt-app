// Ticking "all" means the rows in front of the admin, not every row that
// matches behind the paging. A tick that silently reached rows nobody had
// seen would be worse than the one-at-a-time it replaces, so both helpers
// take the visible ids and leave any selection made on another page alone.
export function allSelected(visible: string[], selected: Set<string>): boolean {
  return visible.length > 0 && visible.every((id) => selected.has(id));
}

export function toggleAll(visible: string[], selected: Set<string>): Set<string> {
  const next = new Set(selected);
  if (allSelected(visible, selected)) visible.forEach((id) => next.delete(id));
  else visible.forEach((id) => next.add(id));
  return next;
}
