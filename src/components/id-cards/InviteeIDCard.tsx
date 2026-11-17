import React from 'react';
import { QRCodeView } from '@/components/common/QRCodeView';
import { Invitee } from '@/types';
import { MapPin, Phone, Calendar, Building2 } from 'lucide-react';

interface InviteeIDCardProps {
  invitee: Invitee;
  className?: string;
  style?: React.CSSProperties;
}

export const InviteeIDCard: React.FC<InviteeIDCardProps> = ({
  invitee,
  className = '',
  style = {},
}) => {
  // Category designation visual styling
  const getCategoryDetails = (category: string) => {
    switch (category) {
      case 'Founder Members':
        return {
          title: 'FOUNDER MEMBER',
          bg: '#FEF3C7',
          color: '#92400E',
          border: '#F59E0B',
        };
      case 'Special Invitees':
        return {
          title: 'SPECIAL INVITEE',
          bg: '#F3E8FF',
          color: '#6B21A8',
          border: '#A855F7',
        };
      case 'General Members':
      default:
        return {
          title: 'GENERAL MEMBER',
          bg: '#ECFDF5',
          color: '#065F46',
          border: '#10B981',
        };
    }
  };

  const cat = getCategoryDetails(invitee.category);
  const qrValue = invitee.qr_token || invitee.id;

  // Controlled font size for delegate name based on string length (13-14pt bold)
  const nameLength = invitee.full_name?.length || 0;
  const nameFontSize = nameLength > 28 ? '11.5pt' : nameLength > 18 ? '13pt' : '14pt';

  // Dedicated remarks: display only the actual remarks string without prefix; hide if empty
  const displayRemarks = (invitee.id_card_remarks || '').trim();

  return (
    <div
      className={`aimplb-id-card ${className}`}
      style={{
        width: '90mm',
        height: '140mm',
        minWidth: '90mm',
        minHeight: '140mm',
        maxWidth: '90mm',
        maxHeight: '140mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: '4.5mm',
        border: '1.2mm solid #164734',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        ...style,
      }}
    >
      {/* =========================================================================
          UPPER SECTION: HEADER WITH LOGO ON THE LEFT
          Hierarchy:
          1. AIMPLB Logo on the LEFT
          2. ALL INDIA MUSLIM PERSONAL LAW BOARD beside it
          3. 30TH ANNUAL SESSION – CHENNAI beside it
          4. Event Date: 14–16 December 2026
          5. Venue: Hajj House, Chennai
          ========================================================================= */}
      <div
        style={{
          backgroundColor: '#164734',
          padding: '2.2mm 3mm 2mm 3mm',
          position: 'relative',
          borderTopLeftRadius: '3.3mm',
          borderTopRightRadius: '3.3mm',
          borderBottom: '0.6mm solid #D4AF37',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Subtle top gold accent line with matching rounded corners */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1mm',
            borderTopLeftRadius: '3.3mm',
            borderTopRightRadius: '3.3mm',
            background: 'linear-gradient(90deg, #B8860B 0%, #F5E6AB 50%, #B8860B 100%)',
          }}
        />

        {/* Header Content Row: Logo on LEFT, Organization & Session Titles beside it */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2.5mm',
            marginTop: '0.5mm',
          }}
        >
          {/* 1. AIMPLB Logo (LEFT aligned, original aspect ratio strictly preserved) */}
          <div
            style={{
              width: '13mm',
              height: '14mm',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/AIMPLB_logo.png"
              alt="AIMPLB Logo"
              style={{
                width: 'auto',
                height: '14mm',
                maxWidth: '13mm',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          {/* 2 & 3. Organization & Session Title beside the logo */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                color: '#FFFFFF',
                fontSize: '7.5pt',
                fontWeight: 800,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                lineHeight: 1.15,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              All India Muslim Personal Law Board
            </div>
            <div
              style={{
                color: '#F5E6AB',
                fontSize: '6.8pt',
                fontWeight: 700,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                marginTop: '0.6mm',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              30th Annual Session – Chennai
            </div>
          </div>
        </div>

        {/* Subtle Hairline Gold Separator */}
        <div
          style={{
            height: '0.3mm',
            width: '100%',
            background: 'linear-gradient(90deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.8) 50%, rgba(212,175,55,0.2) 100%)',
          }}
        />

        {/* 4 & 5. Event Date & Venue (Prominently placed in the upper section) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#FFFFFF',
            fontSize: '6.2pt',
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            padding: '0 0.5mm',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.8mm' }}>
            <Calendar style={{ width: '2.4mm', height: '2.4mm', color: '#F5E6AB', flexShrink: 0 }} />
            <span>14–16 December 2026</span>
          </span>
          <span style={{ color: '#D4AF37' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.8mm' }}>
            <Building2 style={{ width: '2.4mm', height: '2.4mm', color: '#F5E6AB', flexShrink: 0 }} />
            <span>Hajj House, Chennai</span>
          </span>
        </div>
      </div>

      {/* =========================================================================
          BODY SECTION: BALANCED SPACING & CLEAR HIERARCHY
          6. Invitee Category / Designation
          7. Invitee Name
          8. Unique ID
          9. QR Code & Description (Enlarged 35mm high-resolution scan target)
          10. Contact Details
          11. Guaranteed Dedicated Remarks
          ========================================================================= */}
      <div
        style={{
          flex: 1,
          padding: '2.2mm 3.5mm 2mm 3.5mm',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          boxSizing: 'border-box',
        }}
      >
        {/* 6. Invitee Category / Designation Badge */}
        <div>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: cat.bg,
              color: cat.color,
              border: `0.35mm solid ${cat.border}`,
              fontSize: '6.8pt',
              fontWeight: 800,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              padding: '0.8mm 4mm',
              borderRadius: '2.5mm',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {cat.title}
          </span>
        </div>

        {/* 7. Invitee Full Name (Controlled wrapping & clean sizing, no overflow) */}
        <div style={{ width: '100%', margin: '0.3mm 0' }}>
          <div
            style={{
              fontSize: nameFontSize,
              fontWeight: 800,
              color: '#164734',
              lineHeight: 1.18,
              letterSpacing: '-0.2px',
              fontFamily: "'Inter', sans-serif",
              maxHeight: '9.5mm',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {invitee.full_name}
          </div>
        </div>

        {/* 8. Unique ID Badge */}
        <div>
          <span
            style={{
              fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
              fontSize: '8.4pt',
              fontWeight: 800,
              letterSpacing: '1px',
              color: '#164734',
              backgroundColor: '#E8F1EC',
              border: '0.35mm solid #C5DEC8',
              borderRadius: '2.5mm',
              padding: '0.6mm 4mm',
              display: 'inline-block',
            }}
          >
            {invitee.invitee_code}
          </span>
        </div>

        {/* 9. QR Code with Clear Description Labels (Enlarged 40mm Target in 44mm container) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0.4mm 0',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '0.4mm solid #E3E7E4',
              borderRadius: '3.5mm',
              padding: '2mm',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44mm',
              height: '44mm',
              boxSizing: 'border-box',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            }}
          >
            <QRCodeView
              value={qrValue}
              size={360}
              style={{ width: '40mm', height: '40mm', display: 'block' }}
            />
          </div>

          {/* Clear QR Purpose Description */}
          <div style={{ marginTop: '0.6mm', textAlign: 'center' }}>
            <div
              style={{
                color: '#164734',
                fontSize: '7pt',
                fontWeight: 800,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                lineHeight: 1.15,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              OFFICIAL GATE PASS
            </div>
            <div
              style={{
                color: '#69756F',
                fontSize: '5.3pt',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginTop: '0.3mm',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              SCAN FOR ENTRY VERIFICATION
            </div>
          </div>
        </div>

        {/* 10. Contact Details (City, State & Phone) */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2.5mm',
            color: '#1A221E',
            fontFamily: "'Inter', sans-serif",
            marginTop: '0.3mm',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8mm',
              fontSize: '8pt',
              fontWeight: 700,
              maxWidth: '52mm',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <MapPin style={{ width: '2.8mm', height: '2.8mm', color: '#164734', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {invitee.city}, {invitee.state}
            </span>
          </span>
          {invitee.phone && (
            <>
              <span style={{ color: '#D1D5DB' }}>•</span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8mm',
                  fontSize: '6.8pt',
                  fontWeight: 600,
                  fontFamily: "'SFMono-Regular', Consolas, monospace",
                  flexShrink: 0,
                  color: '#374151',
                }}
              >
                <Phone style={{ width: '2.4mm', height: '2.4mm', color: '#164734', flexShrink: 0 }} />
                <span>{invitee.phone}</span>
              </span>
            </>
          )}
        </div>

        {/* 11. DEDICATED REMARKS SECTION (Rendered only when remarks exist, without prefix) */}
        {displayRemarks ? (
          <div
            style={{
              width: '100%',
              maxWidth: '83mm',
              backgroundColor: '#FEF3C7',
              border: '0.35mm solid #FDE68A',
              borderRadius: '2.5mm',
              padding: '1.1mm 2.2mm',
              fontSize: '6.4pt',
              fontWeight: 600,
              color: '#78350F',
              lineHeight: 1.25,
              textAlign: 'center',
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              boxSizing: 'border-box',
              fontFamily: "'Inter', sans-serif",
              marginTop: '0.4mm',
            }}
          >
            <span>{displayRemarks}</span>
          </div>
        ) : null}
      </div>

      {/* Subtle bottom gold/green institutional footer line with matching rounded corners */}
      <div
        style={{
          height: '1.2mm',
          width: '100%',
          borderBottomLeftRadius: '3.3mm',
          borderBottomRightRadius: '3.3mm',
          background: 'linear-gradient(90deg, #164734 0%, #D4AF37 50%, #164734 100%)',
        }}
      />
    </div>
  );
};
