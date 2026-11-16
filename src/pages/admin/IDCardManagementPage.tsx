import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Printer,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Dialog } from '@/components/ui/dialog';
import { InviteeIDCard } from '@/components/id-cards/InviteeIDCard';
import { Invitee, InviteeCategory } from '@/types';
import { getInvitees } from '@/services/api';
import { useToast } from '@/context/ToastContext';

export const IDCardManagementPage: React.FC = () => {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const initialInviteeId = searchParams.get('invitee');

  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InviteeCategory | 'all'>('all');

  // Preview Modal for individual badge
  const [previewInvitee, setPreviewInvitee] = useState<Invitee | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Dedicated Print Target State
  const [printTarget, setPrintTarget] = useState<Invitee[] | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getInvitees();
      setInvitees(data);
      if (initialInviteeId) {
        const found = data.find((i) => i.id === initialInviteeId);
        if (found) {
          setPreviewInvitee(found);
          setIsPreviewOpen(true);
        }
      }
    } catch (err) {
      console.error('Error loading invitees for ID cards:', err);
      toast.show('Failed to load delegate records for ID cards.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [initialInviteeId, toast]);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('aimplb_db_update', handleUpdate);
    return () => window.removeEventListener('aimplb_db_update', handleUpdate);
  }, [loadData]);

  // Filtered invitees based on search and category
  const filteredInvitees = useMemo(() => {
    return invitees.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.full_name.toLowerCase().includes(q) ||
        inv.invitee_code.toLowerCase().includes(q) ||
        inv.phone.includes(q) ||
        inv.city.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'all' || inv.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [invitees, searchQuery, selectedCategory]);

  // Active print cards list (isolated print container source of truth)
  const activePrintCards = useMemo(() => {
    if (printTarget && printTarget.length > 0) {
      return printTarget;
    }
    if (isPreviewOpen && previewInvitee) {
      return [previewInvitee];
    }
    return filteredInvitees;
  }, [printTarget, isPreviewOpen, previewInvitee, filteredInvitees]);

  // Dedicated Print Trigger: sets isolation class and invokes window.print()
  const triggerPrint = useCallback(
    (targetCards: Invitee[]) => {
      if (!targetCards || targetCards.length === 0) {
        toast.show('No delegate badges available to print.', 'warning');
        return;
      }

      setPrintTarget(targetCards);
      document.body.classList.add('aimplb-printing-id-card');

      // Small delay allows React to commit DOM state into the portal before browser locks execution
      setTimeout(() => {
        window.print();
      }, 120);
    },
    [toast]
  );

  // Sync print cleanup and browser shortcut listeners (Ctrl+P / Cmd+P)
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('aimplb-printing-id-card');
      setPrintTarget(null);
    };

    const handleBeforePrint = () => {
      if (!document.body.classList.contains('aimplb-printing-id-card')) {
        document.body.classList.add('aimplb-printing-id-card');
        if (previewInvitee) {
          setPrintTarget([previewInvitee]);
        } else {
          setPrintTarget(filteredInvitees);
        }
      }
    };

    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('beforeprint', handleBeforePrint);
      document.body.classList.remove('aimplb-printing-id-card');
    };
  }, [previewInvitee, filteredInvitees]);

  const handlePrintSingle = (inv: Invitee) => {
    triggerPrint([inv]);
  };

  const handlePrintAllVisible = () => {
    triggerPrint(filteredInvitees);
  };

  if (isLoading) {
    return <LoadingSkeleton rows={8} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="no-print">
        <PageHeader
          title="Delegate ID Card & Badge Management"
          subtitle="Generate, preview, and print standardized 90 mm × 140 mm AIMPLB 30th Annual Session delegate badges with category IDs and secure QR codes."
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handlePrintAllVisible}
                className="bg-[#164734] hover:bg-[#123829] text-white flex items-center gap-1.5 h-9 text-xs font-bold shadow-xs"
              >
                <Printer className="h-4 w-4" />
                <span>Bulk Print ({filteredInvitees.length})</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="flex items-center gap-1.5 h-9 text-xs text-[#69756F]"
                title="Refresh datasets"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Category Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between no-print">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by delegate name, ID code, city..."
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[#69756F] font-semibold text-[11px] uppercase mr-1">Category:</span>
          {(['all', 'Founder Members', 'General Members', 'Special Invitees'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#164734] text-white font-semibold shadow-xs'
                  : 'bg-[#FAF9F6] text-[#69756F] hover:bg-[#E8F1EC] border border-[#E3E7E4]'
              }`}
            >
              {cat === 'all' ? `All Categories (${invitees.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Badges Grid (Interactive Screen View) */}
      {filteredInvitees.length === 0 ? (
        <EmptyState
          title="No delegates found"
          description="Try adjusting your search criteria or category filter."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedCategory('all');
          }}
        />
      ) : (
        <div className="flex flex-wrap justify-center gap-8 no-print">
          {filteredInvitees.map((inv) => (
            <div key={inv.id} style={{ width: '90mm' }} className="flex flex-col items-center group relative">
              {/* Standardized 90mm x 140mm ID Card View */}
              <InviteeIDCard invitee={inv} />

              {/* Action buttons below each card on screen */}
              <div
                className="w-full mt-3 flex items-center justify-between gap-2 px-1"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPreviewInvitee(inv);
                    setIsPreviewOpen(true);
                  }}
                  className="flex-1 h-8 text-xs text-[#164734] border-[#C5DEC8] hover:bg-[#E8F1EC] font-semibold"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  <span>Preview Badge</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handlePrintSingle(inv)}
                  className="h-8 text-xs bg-[#164734] hover:bg-[#123829] text-white px-3 font-semibold shadow-xs"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  <span>Print Card</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Card Preview Modal (Interactive On-Screen Inspector) */}
      {previewInvitee && (
        <Dialog
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={`Delegate Badge: ${previewInvitee.full_name}`}
          maxWidth="md"
        >
          <div className="space-y-4 flex flex-col items-center">
            {/* Card Preview Container */}
            <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E3E7E4] flex justify-center w-full overflow-hidden">
              <InviteeIDCard invitee={previewInvitee} />
            </div>

            {/* Modal Controls (Strictly hidden during actual print) */}
            <div className="flex items-center justify-between w-full pt-2 border-t border-[#F4F6F4]">
              <div className="text-xs text-[#69756F]">
                ID:{' '}
                <span className="font-mono font-bold text-[#164734]">
                  {previewInvitee.invitee_code}
                </span>{' '}
                • 90 mm × 140 mm
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewOpen(false)}
                  className="h-8 text-xs font-semibold"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => handlePrintSingle(previewInvitee)}
                  className="bg-[#164734] hover:bg-[#123829] text-white h-8 text-xs font-bold shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  <span>Print Single Badge</span>
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* =========================================================================
          ISOLATED PRINT PORTAL
          Rendered directly into document.body outside #root.
          When printing, #root is hidden and ONLY this container is printed.
          Zero modal headers, zero close buttons, zero navigation bars, zero blank pages!
          ========================================================================= */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="aimplb-print-isolated-root" aria-hidden="true">
            {activePrintCards.map((inv) => (
              <div key={inv.id} className="aimplb-print-badge-page">
                <InviteeIDCard invitee={inv} />
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};
