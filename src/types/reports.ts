export type ReportSummary = {
  totalChildren: number;
  monthlyLogCount: number;
  totalPresentDays: number;
  lastUpdate: string | null;
};

export type ReportStats<Child = unknown> = {
  children: Child[];
  summary: ReportSummary;
};