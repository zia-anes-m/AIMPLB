-- ====================================================================
-- AIMPLB 30th Annual Session - Default Seed Data & Configuration
-- ====================================================================

-- 1. Insert Initial System Settings for Dropdowns and Options
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES
    ('event_info', '{
        "organization": "All India Muslim Personal Law Board",
        "event_name": "30th Annual Session",
        "dates": ["2026-12-14", "2026-12-15", "2026-12-16"],
        "venue": "Hajj House, Chennai, Tamil Nadu, India",
        "description": "Centralized event coordination and volunteer management portal"
    }'::jsonb),
    
    ('invitee_categories', '["Founder Members", "General Members", "Special Invitees"]'::jsonb),

    ('transport_options', '{
        "modes": ["Flight", "Train", "Bus", "Car", "Other"],
        "airports": [
            "Chennai International Airport, Meenambakkam",
            "Other"
        ],
        "railway_stations": [
            "Chennai Central (Puratchi Thalaivar Dr. M.G. Ramachandran Central)",
            "Chennai Egmore",
            "Tambaram",
            "Other"
        ],
        "bus_stations": [
            "Kilambakkam Bus Terminus (Kalaignar Centenary Bus Terminus)",
            "Koyambedu Bus Terminus (Puratchi Thalaivar Dr. MGR Bus Terminus)",
            "Other"
        ]
    }'::jsonb),

    ('accommodation_options', '{
        "types": ["Hotel", "Hajj House", "Other", "No accommodation required"],
        "hotels": ["Ramada", "Orion", "Rivera", "Mathi", "Other"],
        "hajj_house_rooms": ["AC Room", "Non-AC Room"],
        "hotel_room_types": ["Standard Single", "Standard Double", "Deluxe Suite", "Executive Suite"]
    }'::jsonb),

    ('food_options', '{
        "dietary_preferences": ["Non-vegetarian", "Vegetarian", "Jain / Special Diet"],
        "providers": [
            {
                "name": "Chennai Biryani & Catering Co.",
                "contact_person": "Haji Farooq Ahmed",
                "phone": "+91 98400 12345",
                "notes": "Primary caterer for lunch and dinner banquets"
            },
            {
                "name": "Al-Mina Refreshments",
                "contact_person": "Brother Tariq",
                "phone": "+91 98401 67890",
                "notes": "Tea, snacks, breakfast and bottled water delivery"
            }
        ],
        "meal_types": ["Breakfast", "Lunch", "Dinner", "Tea & Refreshments"]
    }'::jsonb),

    ('meeting_hall_options', '{
        "halls": ["Main Auditorium", "Conference Hall A", "Conference Hall B", "Executive Committee Room"],
        "sections": ["Presidium / VIP Row", "Founder Members Section", "General Members - Block A", "General Members - Block B", "Special Invitees Wing", "Press & Media Gallery"]
    }'::jsonb)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    updated_at = timezone('utc'::text, now());

