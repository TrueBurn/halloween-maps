const config = {
    default: {
        location: [-33.819689, 18.688568],
    },
    supabase: {
        url: 'https://ucehbwwpkbfjynitppif.supabase.co',
        anon_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZWhid3dwa2JmanluaXRwcGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTczMTQ3NDcsImV4cCI6MjAxMjg5MDc0N30.YUo0-5_JBdysEJbnL1q-xTJ2eOhfoGqW5fz4ifPudgg'
    },
    gMaps: {
        styles: {
            default: [],
            hide: [
              {
                featureType: "poi.business",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "transit",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }],
              },
            ],
          }
    }
};