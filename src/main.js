const { createClient } = supabase;

const _supabaseClient = createClient(
  config.supabase.url,
  config.supabase.anon_token,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

let arrayOfLatLngs = [];
let userMarker;

// Define default location (replace with Uitzicht coordinates)
const defaultLocation = [-33.8688, 18.5122]; // Example: Cape Town coordinates
const defaultZoom = 15; // Adjust this value as needed

// Initialize the map with default location
const map = L.map('map').setView(defaultLocation, defaultZoom);

// Create both light and dark tile layers
const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
});

const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors, © CARTO'
});

// Set initial tile layer based on current theme
if (document.documentElement.classList.contains('dark')) {
  darkTiles.addTo(map);
} else {
  lightTiles.addTo(map);
}

function onLocationFound(e) {
  let radius = e.accuracy;

  if (userMarker) {
    userMarker.bindPopup("You are within " + radius + " meters from this point")
    userMarker.setLatLng(e.latlng)
  } else {
    userMarker = new L.marker(e.latlng)
    userMarker
      .addTo(map)
      .bindPopup("You are within " + radius + " meters from this point");
  }

  // L.marker(e.latlng)
  //   .addTo(map)
  //   .bindPopup("You are within " + radius + " meters from this point");
  // .openPopup();

  // L.circle(e.latlng, radius).addTo(map);
}

function onLocationError(e) {
  console.error(e.message);
  // map.setView(config.default.location, 16);
}

map.on("locationfound", onLocationFound);
map.on("locationerror", onLocationError);

map.locate({ watch: true, enableHighAccuracy: true });

let participatingIcon = L.Icon.extend({
  options: {
    iconSize: [50, 50],
    // iconAnchor:   [22, 94],
    // shadowAnchor: [4, 62],
    // popupAnchor:  [-3, -76]
  },
});

let houseIcon = new participatingIcon({ 
  iconUrl: "assets/house.png" 
});
let houseWithNoCandyIcon = new participatingIcon({
  iconUrl: "assets/house_no_candy.png",
  opacity: 0.75
});
let houseStartIcon = new participatingIcon({
  iconUrl: "assets/house_start.png"
});
let tableIcon = new participatingIcon({ 
  iconUrl: "assets/table.png",
  iconSize: [40, 40]
});
let tableStartIcon = new participatingIcon({ 
  iconUrl: "assets/table_start.png",
  iconSize: [40, 40]
});
let tableWithNoCandyIcon = new participatingIcon({
  iconUrl: "assets/table_no_candy.png",
  iconSize: [40, 40],
  opacity: 0.75
});
let parkingIcon = new participatingIcon({ 
  iconUrl: "assets/parking.png" 
});
let refreshmentsIcon = new participatingIcon({
  iconUrl: "assets/refreshments.png",
});

let getLocations = async () => {
  const { data, error } = await _supabaseClient
    .from("location")
    .select("id, address, latitude, longitude, location_type, is_participating, phone_number, has_candy, is_start, route")
    .eq("is_participating", true);
  if (error) console.log("error", error);
  loadHouses(data);
};

getLocations();

function loadHouses(locations) {
  if (locations.length === 0) {
    // If no locations, center on default location
    map.setView(defaultLocation, defaultZoom);
    return;
  }
  
  locations.forEach((location) => {
    arrayOfLatLngs.push(L.latLng(location.latitude, location.longitude));
    L.marker([location.latitude, location.longitude], {
      icon: getIconForLocation(location),
      zIndexOffset: getZIndexForLocation(location)
    })
      .addTo(map)
      .bindPopup(generatePopupForLocation(location));
  });
  
  if (arrayOfLatLngs.length > 0) {
    let bounds = L.latLngBounds(arrayOfLatLngs);
    map.fitBounds(bounds);
  } else {
    // Fallback to default location if bounds couldn't be calculated
    map.setView(defaultLocation, defaultZoom);
  }
}

function getIconForLocation(location) {
  let icon = houseIcon;
  switch (location.location_type) {
    case "House":
      if (location.is_start) {
        icon = houseStartIcon;
      } else {
        icon = location.has_candy 
          ? houseIcon 
          : houseWithNoCandyIcon;
      }
      break;
    case "Table":
      if (location.is_start) {
        icon = tableStartIcon;
      } else {
        icon = location.has_candy 
          ? tableIcon 
          : tableWithNoCandyIcon;
      }
      
      break;
    case "Parking":
      icon = parkingIcon;
      break;
    case "Refreshments":
      icon = refreshmentsIcon;
      break;
  }
  return icon;
}

function generatePopupForLocation(location) {
  let popupContent = `<b>${location.address}</b>`;
  
  popupContent += `<br>Type: ${location.location_type}`;
  
  if (location.route) {
    popupContent += `<br>Route: ${location.route}`;
  }
  
  if (location.has_candy !== null) {
    popupContent += `<br>Has candy: ${location.has_candy ? 'Yes' : 'No'}`;
  }
  
  if (location.is_start) {
    popupContent += `<br><strong>Starting point</strong>`;
  }
  
  if (location.phone_number) {
    popupContent += `<br><i class="fas fa-cog" style="cursor: pointer;" onclick="openConfigPage('${location.id}')" title="Configure"></i>`;
  }
  
  return popupContent;
}

function getZIndexForLocation(location) {
  let zIndex = 0;
  switch (location.location_type) {
    case "House":
      zIndex = 50;
      break;
    case "Table":
      zIndex = 8;
      break;
    case "Parking":
      zIndex = 4;
      break;
    case "Refreshments":
      zIndex = 6;
      break;
  }
  return zIndex;
}

// Add theme toggle listener
const themeToggle = document.getElementById('darkModeToggle');
const themeIcon = themeToggle.querySelector('i');

function updateThemeIcon() {
  if (document.documentElement.classList.contains('dark')) {
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  } else {
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  }
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.theme = isDark ? 'dark' : 'light';
  setCookie('theme', isDark ? 'dark' : 'light', 365); // Store preference for 1 year
  
  if (isDark) {
    map.removeLayer(lightTiles);
    darkTiles.addTo(map);
  } else {
    map.removeLayer(darkTiles);
    lightTiles.addTo(map);
  }
  
  updateThemeIcon();
}

// Add this line to attach the click event listener
themeToggle.addEventListener('click', toggleTheme);

// Add these functions at the beginning of the file
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Modify the initial theme setup
const savedTheme = getCookie('theme') || localStorage.theme;
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
  darkTiles.addTo(map);
} else {
  document.documentElement.classList.remove('dark');
  lightTiles.addTo(map);
}

// Initial icon update
updateThemeIcon();

// Add this function to handle the "Configure" button click
function openConfigPage(locationId) {
  const configUrl = `config.html?locationId=${locationId}`;
  window.open(configUrl, '_blank');
}

// ... rest of the existing code ...
