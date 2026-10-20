export function TabList({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={selected ? "page" : undefined}
            className={`shrink-0 cursor-pointer border-b-2 px-3 py-2.5 text-sm ${
              selected
                ? "border-navy font-medium text-navy"
                : "border-transparent text-muted hover:text-navy"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
