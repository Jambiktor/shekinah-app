import { ReportStats } from "../../types/reports";

export const createEmptyReportStats = <Child = any>(): ReportStats<Child> => ({
  children: [],
  summary: {
    totalChildren: 0,
    monthlyLogCount: 0,
    totalPresentDays: 0,
    lastUpdate: null,
  },
});
