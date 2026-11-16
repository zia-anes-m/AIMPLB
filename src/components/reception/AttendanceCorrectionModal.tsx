import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EventAttendanceRecord } from '@/types';
import { correctEventAttendance } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: EventAttendanceRecord | null;
  onSuccess: () => void;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  isOpen,
  onClose,
  record,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [entryTime, setEntryTime] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [status, setStatus] = useState<'IN' | 'OUT'>('IN');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      // Format ISO string to datetime-local format YYYY-MM-DDTHH:mm
      const formatLocal = (iso?: string | null) => {
        if (!iso) return '';
        try {
          const d = new Date(iso);
          return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        } catch {
          return '';
        }
      };

      setEntryTime(formatLocal(record.entry_time));
      setExitTime(formatLocal(record.exit_time));
      setStatus(record.status === 'IN' ? 'IN' : 'OUT');
      setNotes(record.entry_notes || record.exit_notes || '');
      setReason('');
    }
  }, [record, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record || !currentUser) return;
    if (!reason.trim()) {
      toast.show('Please provide a mandatory audit reason for this correction.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: Partial<EventAttendanceRecord> = {
        status,
        entry_time: entryTime ? new Date(entryTime).toISOString() : record.entry_time,
        exit_time: exitTime ? new Date(exitTime).toISOString() : null,
        entry_notes: notes,
      };

      await correctEventAttendance(record.id, updates, currentUser, reason.trim());
      toast.show('Movement attendance record corrected with audit log.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.show(err.message || 'Failed to correct record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Authorized Movement Correction" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E3E7E4] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#69756F]">Delegate</span>
            <p className="text-sm font-bold text-[#1A221E]">{record.invitee?.full_name}</p>
            <p className="text-xs font-mono text-[#164734] font-semibold">{record.invitee?.invitee_code}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#69756F]">Current Status</span>
            <div className="mt-1">
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  record.status === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {record.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-[#1A221E] mb-1">Entry Timestamp (IN)</label>
            <input
              type="datetime-local"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-[#E3E7E4] px-3 font-mono text-xs focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1A221E] mb-1">Exit Timestamp (OUT)</label>
            <input
              type="datetime-local"
              value={exitTime}
              onChange={(e) => {
                setExitTime(e.target.value);
                if (e.target.value) setStatus('OUT');
              }}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] px-3 font-mono text-xs focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-[#1A221E] mb-1">Status Override</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus('IN')}
              className={`flex-1 py-2 rounded-lg font-bold border transition-colors ${
                status === 'IN'
                  ? 'bg-[#164734] text-white border-[#164734]'
                  : 'bg-white text-[#69756F] border-[#E3E7E4]'
              }`}
            >
              INSIDE (Active Session)
            </button>
            <button
              type="button"
              onClick={() => setStatus('OUT')}
              className={`flex-1 py-2 rounded-lg font-bold border transition-colors ${
                status === 'OUT'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-[#69756F] border-[#E3E7E4]'
              }`}
            >
              OUT (Completed Session)
            </button>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-[#1A221E] mb-1">Correction Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Scanned late, forgot to scan at east gate..."
            className="h-10 w-full rounded-lg border border-[#E3E7E4] px-3 focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-bold text-red-900">
              Mandatory Audit Reason <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-[#69756F]">Will be logged in Audit Trail</span>
          </div>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="Reason for manual adjustment (e.g. Authorized by Chief Coordinator)"
            className="h-10 w-full rounded-lg border border-red-300 bg-red-50/30 px-3 font-medium text-red-950 focus:ring-2 focus:ring-red-400"
          />
        </div>

        <div className="pt-3 border-t border-[#F4F6F4] flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#164734] text-white font-semibold">
            Apply Correction
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
