import { notFound } from 'next/navigation';
import { ReportDetailsWorkspace } from '@/components/reports/ReportDetailsWorkspace';
import { getReportKindFromSlug } from '@/components/reports/report-utils';

export default function ReportDetailPage({
  params,
}: {
  params: { report: string };
}) {
  const report = getReportKindFromSlug(params.report);

  if (!report) {
    notFound();
  }

  return <ReportDetailsWorkspace report={report} />;
}
