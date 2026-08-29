"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import { memberForm } from "@/lib/texts";
import FormSelect from "./FormSelect";

const ADD = "__add__";

export default function AgeGroupField({
  idPrefix = "member",
  value,
  ages,
  onChange,
  onAdd,
}: {
  idPrefix?: string;
  value: string;
  ages: string[];
  onChange: (age: string) => void;
  onAdd: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const options = !value || ages.includes(value) ? ages : [value, ...ages];

  function pick(next: string) {
    if (next === ADD) {
      setAdding(true);
      onChange("");
      return;
    }
    setAdding(false);
    onChange(next);
  }

  function confirm() {
    const name = draft.trim();
    if (!name) return;
    onAdd(name);
    onChange(name);
    setDraft("");
    setAdding(false);
  }

  return (
    <div>
      <FormSelect
        id={`${idPrefix}-age`}
        label={memberForm.ageLabel}
        placeholder={memberForm.agePlaceholder}
        value={adding ? ADD : value}
        options={options}
        onChange={pick}
        extraOption={{ value: ADD, label: memberForm.addAge }}
        search={{
          placeholder: memberForm.ageSearchPlaceholder,
          label: memberForm.ageSearchLabel,
          empty: memberForm.ageNoMatch,
        }}
      />

      {adding && (
        <>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={memberForm.newAgePlaceholder}
              maxLength={30}
              className="input flex-1"
              aria-label={memberForm.newAgePlaceholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirm();
                }
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={confirm}
              disabled={!draft.trim()}
              className="btn btn-primary px-4 py-2 text-sm font-bold disabled:opacity-40"
              style={{ width: "auto" }}
            >
              {memberForm.addAgeAction}
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {memberForm.addAgeNote}
          </p>
        </>
      )}

      {value && !adding && (
        <p className="text-xs mt-1 font-semibold" style={{ color: "var(--mint-600)" }}>
          <IconLabel name="check">{value}</IconLabel>
        </p>
      )}
    </div>
  );
}
