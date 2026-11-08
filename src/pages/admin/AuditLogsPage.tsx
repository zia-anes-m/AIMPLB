import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Database,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { MobileDataCard } from '@/components/common/MobileDataCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { Dialog } from '@/components/ui/dialog';
import { getAuditLogs } from '@/services/api';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  useEffect(() => {
    async function load() {
      try {
        const data = await getAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error('Error loading audit trail:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.table_name.toLowerCase().includes(q) ||
      (log.user_name && log.user_name.toLowerCase().includes(q)) ||
      log.record_id.toLowerCase().includes(q);

    const matchesTable = tableFilter === 'all' || log.table_name === tableFilter;
    return matchesSearch && matchesTable;
  });

  const getActionVariant = (action: string) => {
    switch (action.toUpperCase()) {
      case 'INSERT':
        return 'success' as const;
      case 'DELETE':
        return 'danger' as const;
      case 'UPDATE':
      default:
        return 'info' as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="System Security & Audit Trail"
        subtitle="Immutable historical log of all database modifications, user actions, and sensitive profile edits"
        badge={`${logs.length} Logged Events`}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#69756F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, volunteer, table..."
            className="h-10 w-full rounded-lg border border-[#E3E7E4] pl-9 pr-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          />
        </div>

        <div className="flex items-center gap-2 justify-between md:justify-end">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <Filter className="h-3.5 w-3.5 text-[#69756F] shrink-0" />
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="h-9 w-full sm:w-auto text-xs rounded-lg border border-[#E3E7E4] bg-white px-3 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="all">All Modified Tables</option>
              <option value="invitees">invitees</option>
              <option value="transportation">transportation</option>
              <option value="accommodations">accommodations</option>
              <option value="food_arrangements">food_arrangements</option>
              <option value="reception">reception</option>
              <option value="meeting_hall_assignments">meeting_hall_assignments</option>
              <option value="profiles">profiles</option>
              <option value="system_settings">system_settings</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="hidden sm:flex items-center rounded-lg border border-[#E3E7E4] bg-[#FAF9F6] p-0.5">
            <button
              onClick={() => setViewMode('auto')}
              title="Responsive View"
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'auto'
                  ? 'bg-white text-[#164734] shadow-xs'
                  : 'text-[#69756F] hover:text-[#1A221E]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-[#164734] shadow-xs'
                  : 'text-[#69756F] hover:text-[#1A221E]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              title="Cards View"
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-[#164734] shadow-xs'
                  : 'text-[#69756F] hover:text-[#1A221E]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : (
        <>
          {/* Mobile Cards View */}
          <div
            className={`space-y-3 ${
              viewMode === 'table'
                ? 'hidden'
                : viewMode === 'cards'
                ? 'block'
                : 'block md:hidden'
            }`}
          >
            {filteredLogs.map((log) => (
              <MobileDataCard
                key={log.id}
                title={`${log.action} on ${log.table_name}`}
                identifier={log.table_name}
                subtitle={`Record: ${log.record_id}`}
                badge={
                  <StatusBadge
                    variant={getActionVariant(log.action)}
                    label={log.action}
                    size="sm"
                  />
                }
                fields={[
                  {
                    label: 'Actor / User',
                    value: log.user_name || 'System Auto-Trigger',
                    icon: User,
                  },
                  {
                    label: 'Timestamp (UTC)',
                    value: formatDateTime(log.created_at),
                    icon: Calendar,
                  },
                  {
                    label: 'Target Entity',
                    value: log.table_name,
                    icon: Database,
                  },
                  {
                    label: 'Record ID',
                    value: (
                      <span className="font-mono text-[11px] truncate block">
                        {log.record_id}
                      </span>
                    ),
                  },
                ]}
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-8 text-[#164734] border-[#164734]/30 hover:bg-[#E8F1EC]"
                    onClick={() => setSelectedLog(log)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    <span>Inspect Mutation Payload</span>
                  </Button>
                }
              />
            ))}
          </div>

          {/* Desktop Table View */}
          <div
            className={`bg-white rounded-2xl border border-[#E3E7E4] shadow-card-subtle overflow-hidden ${
              viewMode === 'cards'
                ? 'hidden'
                : viewMode === 'table'
                ? 'block'
                : 'hidden md:block'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Table</th>
                    <th className="py-3 px-4">Record Identifier</th>
                    <th className="py-3 px-4">Authorized User</th>
                    <th className="py-3 px-4 text-right">Data Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#69756F] whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge
                          variant={getActionVariant(log.action)}
                          label={log.action}
                          size="sm"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-[#164734] whitespace-nowrap">
                        <span className="bg-[#E8F1EC] px-2 py-0.5 rounded">
                          {log.table_name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#1A221E] whitespace-nowrap">
                        {log.record_id}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-[#1A221E] whitespace-nowrap">
                        {log.user_name || 'System Auto-Trigger'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5 text-[#164734] border-[#164734]/30 hover:bg-[#E8F1EC]"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span>Payload</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Payload Modal */}
      <Dialog
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Audit Record: ${selectedLog?.action} on ${selectedLog?.table_name}`}
        description={`Record ID: ${selectedLog?.record_id} • User: ${selectedLog?.user_name || 'System'}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {selectedLog?.previous_data && (
            <div>
              <p className="font-semibold text-red-700 mb-1.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-600" />
                <span>Previous Data (Before Mutation):</span>
              </p>
              <pre className="p-3.5 bg-red-50/50 rounded-xl border border-red-200 overflow-x-auto font-mono text-[11px] text-[#1A221E] leading-relaxed">
                {JSON.stringify(selectedLog.previous_data, null, 2)}
              </pre>
            </div>
          )}

          {selectedLog?.new_data && (
            <div>
              <p className="font-semibold text-emerald-800 mb-1.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                <span>New Data (Committed):</span>
              </p>
              <pre className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#E3E7E4] overflow-x-auto font-mono text-[11px] text-[#1A221E] leading-relaxed">
                {JSON.stringify(selectedLog.new_data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
