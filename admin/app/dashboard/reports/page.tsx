'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { Download, FileText } from 'lucide-react';

type ReportType = 'users' | 'subscriptions' | 'activity';

const REPORT_OPTIONS: { value: ReportType; label: string; description: string }[] = [
  {
    value: 'users',
    label: 'Users Export',
    description: 'All user accounts with signup date, school, plan, and activity',
  },
  {
    value: 'subscriptions',
    label: 'Subscriptions Export',
    description: 'Active and expired subscriptions with plan details',
  },
  {
    value: 'activity',
    label: 'Activity Export',
    description: 'Recent analytics events (up to 5,000 rows)',
  },
];

function jsonToCsv(data: Record<string, unknown>[]): string {
  if (!data?.length) return '';
  const flattenObject = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
    return Object.entries(obj).reduce(
      (acc, [k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          Object.assign(acc, flattenObject(v as Record<string, unknown>, key));
        } else {
          acc[key] = String(v ?? '');
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  };
  const rows = data.map((r) => flattenObject(r));
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const header = keys.join(',');
  const body = rows
    .map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

function downloadCsv(data: unknown[], type: ReportType) {
  const csv = jsonToCsv(data as Record<string, unknown>[]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buddi-${type}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>('users');
  const [trigger, setTrigger] = useState(false);
  const pendingDownload = useRef(false);

  const { data, isFetching } = useQuery({
    queryKey: ['export', selectedType, trigger],
    queryFn: () => reportsApi.export(selectedType),
    enabled: trigger,
  });

  useEffect(() => {
    if (data?.length && pendingDownload.current) {
      pendingDownload.current = false;
      setTrigger(false);
      downloadCsv(data as unknown[], selectedType);
    }
  }, [data, selectedType]);

  function handleDownload() {
    pendingDownload.current = true;
    setTrigger(true);
  }

  return (
    <div>
      <PageHeader title="Reports" description="Export platform data as CSV files" />

      <div className="grid gap-4 max-w-xl">
        {REPORT_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-4 bg-zinc-900 border rounded-xl cursor-pointer transition-colors ${
              selectedType === opt.value
                ? 'border-violet-500 bg-violet-900/10'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <input
              type="radio"
              name="reportType"
              value={opt.value}
              checked={selectedType === opt.value}
              onChange={() => setSelectedType(opt.value)}
              className="mt-0.5 accent-violet-500"
            />
            <div>
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-violet-400" />
                <span className="text-sm font-medium text-white">{opt.label}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{opt.description}</p>
            </div>
          </label>
        ))}

        <button
          onClick={handleDownload}
          disabled={isFetching}
          className="flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          <Download size={15} />
          {isFetching ? 'Fetching data…' : 'Download CSV'}
        </button>

        {data && (
          <p className="text-xs text-zinc-500 text-center">
            {(data as unknown[]).length.toLocaleString()} rows ready
          </p>
        )}
      </div>
    </div>
  );
}
