import IconLabel from "@/components/IconLabel";
import { PLAIN_DATASETS, type PlainDataset } from "@/lib/exportRows";
import { settingsPage } from "@/lib/texts";

const LABEL: Record<PlainDataset, string> = {
  members: settingsPage.exportMembers,
  donations: settingsPage.exportDonations,
  ages: settingsPage.exportAges,
};

export default function DataExport() {
  return (
    <div className="card p-4 space-y-3">
      <p className="font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="download">{settingsPage.exportTitle}</IconLabel>
      </p>

      <div className="flex flex-wrap gap-2">
        {PLAIN_DATASETS.map((dataset) => (
          <a
            key={dataset}
            href={`/api/admin/export/${dataset}`}
            className="text-xs px-3 py-2 rounded-lg font-bold"
            style={{
              background: "var(--mint-100)",
              color: "var(--mint-700)",
              border: "1px solid var(--mint-200)",
            }}
          >
            {LABEL[dataset]}
          </a>
        ))}
      </div>
    </div>
  );
}
