import React, { useState, useEffect } from 'react';
import { Save, Building, Plane, Hotel, Armchair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { getSystemSettings, updateSystemSetting } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export const SystemSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [eventName, setEventName] = useState('30th Annual Session');
  const [venue, setVenue] = useState('Hajj House, Chennai, Tamil Nadu, India');
  const [hotels, setHotels] = useState('Ramada, Orion, Rivera, Mathi');
  const [airports, setAirports] = useState('Chennai International Airport, Meenambakkam');
  const [railwayStations, setRailwayStations] = useState(
    'Chennai Central (Puratchi Thalaivar Dr. M.G. Ramachandran Central), Chennai Egmore, Tambaram'
  );
  const [busStations, setBusStations] = useState(
    'Kilambakkam Bus Terminus (KCBT), Koyambedu Bus Terminus (CMBT)'
  );
  const [meetingHalls, setMeetingHalls] = useState(
    'Main Auditorium, Conference Hall A, Conference Hall B, Executive Committee Room'
  );

  useEffect(() => {
    async function load() {
      try {
        const data = await getSystemSettings();

        // Populate fields from settings records
        const eventSett = data.find((s) => s.setting_key === 'event_info')?.setting_value;
        if (eventSett) {
          if (eventSett.event_name) setEventName(eventSett.event_name);
          if (eventSett.venue) setVenue(eventSett.venue);
        }

        const accSett = data.find((s) => s.setting_key === 'accommodation_options')?.setting_value;
        if (accSett?.hotels) {
          setHotels(accSett.hotels.join(', '));
        }

        const transSett = data.find((s) => s.setting_key === 'transport_options')?.setting_value;
        if (transSett) {
          if (transSett.airports) setAirports(transSett.airports.join(', '));
          if (transSett.railway_stations) setRailwayStations(transSett.railway_stations.join(', '));
          if (transSett.bus_stations) setBusStations(transSett.bus_stations.join(', '));
        }

        const hallSett = data.find((s) => s.setting_key === 'meeting_hall_options')?.setting_value;
        if (hallSett?.halls) {
          setMeetingHalls(hallSett.halls.join(', '));
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        toast.error('Failed to load system settings.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);

    try {
      // Update event_info
      await updateSystemSetting(
        'event_info',
        {
          organization: 'All India Muslim Personal Law Board',
          event_name: eventName,
          dates: ['2026-12-14', '2026-12-15', '2026-12-16'],
          venue,
        },
        currentUser
      );

      // Update hotels
      await updateSystemSetting(
        'accommodation_options',
        {
          types: ['Hotel', 'Hajj House', 'Other', 'No accommodation required'],
          hotels: hotels.split(',').map((s) => s.trim()).filter(Boolean),
          hajj_house_rooms: ['AC Room', 'Non-AC Room'],
        },
        currentUser
      );

      // Update transport options
      await updateSystemSetting(
        'transport_options',
        {
          modes: ['Flight', 'Train', 'Bus', 'Car', 'Other'],
          airports: airports.split(',').map((s) => s.trim()).filter(Boolean),
          railway_stations: railwayStations.split(',').map((s) => s.trim()).filter(Boolean),
          bus_stations: busStations.split(',').map((s) => s.trim()).filter(Boolean),
        },
        currentUser
      );

      // Update halls
      await updateSystemSetting(
        'meeting_hall_options',
        {
          halls: meetingHalls.split(',').map((s) => s.trim()).filter(Boolean),
        },
        currentUser
      );

      toast.success(
        'Settings Saved',
        'System configuration and option dropdowns updated successfully.'
      );
    } catch (err: any) {
      console.error('Settings save error:', err);
      toast.error('Save failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={6} />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <PageHeader
        title="Session System Configuration"
        subtitle="Configure event dates, partner hotels, airport stations, and meeting hall dropdowns"
        badge="Settings"
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Event Details Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E3E7E4] shadow-card-subtle space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734] flex items-center gap-2 pb-3 border-b border-[#F4F6F4]">
            <Building className="h-4 w-4" />
            <span>Event Identity & Official Venue</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="eventName"
              label="Session Title"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
            <Input
              id="venue"
              label="Official Venue Address"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Accommodation Options Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E3E7E4] shadow-card-subtle space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734] flex items-center gap-2 pb-3 border-b border-[#F4F6F4]">
            <Hotel className="h-4 w-4" />
            <span>Partner Hotels & Guest Stays</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
              Designated Hotels List (comma-separated)
            </label>
            <input
              type="text"
              value={hotels}
              onChange={(e) => setHotels(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            />
            <p className="mt-1.5 text-[11px] text-[#69756F]">
              Configured options appear automatically in the Accommodation form dropdown.
            </p>
          </div>
        </div>

        {/* Transportation Transfer Options Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E3E7E4] shadow-card-subtle space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734] flex items-center gap-2 pb-3 border-b border-[#F4F6F4]">
            <Plane className="h-4 w-4" />
            <span>Transport Hubs & Stations</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
                Airports List
              </label>
              <input
                type="text"
                value={airports}
                onChange={(e) => setAirports(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E3E7E4] px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
                Railway Stations List
              </label>
              <input
                type="text"
                value={railwayStations}
                onChange={(e) => setRailwayStations(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E3E7E4] px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
                Bus Terminals List
              </label>
              <input
                type="text"
                value={busStations}
                onChange={(e) => setBusStations(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E3E7E4] px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
              />
            </div>
          </div>
        </div>

        {/* Meeting Halls Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E3E7E4] shadow-card-subtle space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734] flex items-center gap-2 pb-3 border-b border-[#F4F6F4]">
            <Armchair className="h-4 w-4" />
            <span>Meeting Halls & Auditoriums</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
              Session Halls (comma-separated)
            </label>
            <input
              type="text"
              value={meetingHalls}
              onChange={(e) => setMeetingHalls(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="md"
            isLoading={isSaving}
            className="flex items-center gap-1.5 bg-[#164734] hover:bg-[#113829] text-white shadow-sm"
          >
            <Save className="h-4 w-4" />
            <span>Save Configuration Settings</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
