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
let userLocation = null;

// Define default location (replace with Uitzicht coordinates)
const defaultLocation = [-33.8688, 18.5122]; // Example: Cape Town coordinates
const defaultZoom = 15; // Adjust this value as needed

// Initialize the map with default location
const map = L.map('map', {
  center: defaultLocation,
  zoom: defaultZoom,
  zoomControl: false  // This disables the zoom buttons
});

// Add these lines after the map initialization:
// map.touchZoom.disable();
// map.doubleClickZoom.disable();
// map.boxZoom.disable();
// map.keyboard.disable();

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
  userLocation = e.latlng;

  if (userMarker) {
    userMarker.setLatLng(e.latlng);
  } else {
    userMarker = new L.marker(e.latlng)
      .addTo(map)
      .bindPopup("You are within " + radius + " meters from this point");
  }

  updateAllPopups(); // Add this line to update all popups
}

function onLocationError(e) {
  console.error(e.message);
  // map.setView(config.default.location, 16);
}

map.on("locationfound", onLocationFound);
map.on("locationerror", onLocationError);

map.locate({ watch: true, enableHighAccuracy: true });

function getIconForLocation(location) {
  let iconSize = [50, 50];
  
  // Increase size for house and refreshments icons
  if (location.location_type === "House") {
    iconSize = [62, 62]; // 50 * 1.25 = 62.5, rounded down to 62
  } else if (location.location_type === "Refreshments") {
    iconSize = [58, 58]; // Make refreshments icon slightly bigger
  }
  
  const baseIconUrl = getBaseIconUrl(location);
  
  // Create a div to hold the icon and overlays
  const iconContainer = L.DomUtil.create('div', 'icon-container');
  iconContainer.style.position = 'relative';
  iconContainer.style.width = `${iconSize[0]}px`;
  iconContainer.style.height = `${iconSize[1]}px`;
  
  const imgElement = L.DomUtil.create('img', 'base-icon', iconContainer);
  imgElement.src = baseIconUrl;
  imgElement.style.width = '100%';
  imgElement.style.height = '100%';
  imgElement.style.position = 'absolute';
  imgElement.style.top = '0';
  imgElement.style.left = '0';

  // Only add overlays for houses, cars, and tables
  if (["House", "Car", "Table"].includes(location.location_type)) {
    const overlaySize = 20; // Slightly smaller overlay size
    const overlayMargin = 5; // Reduced margin to bring overlays closer to center

    if (!location.has_candy) {
      const noCandyOverlay = createOverlay('no-candy', overlaySize, overlayMargin, 'top', 'right');
      iconContainer.appendChild(noCandyOverlay);
    }
    
    if (location.is_start) {
      const startPointOverlay = createOverlay('start-point', overlaySize, overlayMargin, 'bottom', 'left');
      iconContainer.appendChild(startPointOverlay);
    }
    
    if (location.has_activity) {
      const hasActivityOverlay = createOverlay('has-activity', overlaySize, overlayMargin, 'top', 'left');
      iconContainer.appendChild(hasActivityOverlay);
    }
  }

  return L.divIcon({
    html: iconContainer,
    className: 'custom-div-icon',
    iconSize: iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
  });
}

function createOverlay(className, size, margin, verticalPosition, horizontalPosition) {
  const overlay = L.DomUtil.create('div', `icon-overlay ${className}`);
  overlay.style.width = `${size}px`;
  overlay.style.height = `${size}px`;
  overlay.style.position = 'absolute';
  overlay.style[verticalPosition] = `${margin}px`;
  overlay.style[horizontalPosition] = `${margin}px`;
  return overlay;
}

function getBaseIconUrl(location) {
  const baseUrl = 'assets/';
  switch (location.location_type) {
    case "House":
      return `${baseUrl}house.png`;
    case "Table":
      return `${baseUrl}table.png`;
    case "Car":
      return `${baseUrl}table.png`; // Assuming you're using table icon for car
    case "Parking":
      return `${baseUrl}parking.png`;
    case "Refreshments":
      return `${baseUrl}refreshments.png`;
    default:
      return `${baseUrl}house.png`;
  }
}

let getLocations = async () => {
  // Wait for LocationModel to be defined
  if (typeof LocationModel === 'undefined') {
    console.error('LocationModel is not defined. Make sure LocationModel.js is loaded before main.js');
    return;
  }

  const { data, error } = await _supabaseClient
    .from("location")
    .select("id, address, latitude, longitude, location_type, is_participating, phone_number, has_candy, is_start, route, has_activity, activity_details")
    .eq("is_participating", true);
  if (error) console.log("error", error);
  loadHouses(data);
};

// Wrap the initial call in a function that checks for LocationModel
function initializeMap() {
  if (typeof LocationModel !== 'undefined') {
    getLocations();
  } else {
    console.error('LocationModel is not defined. Make sure LocationModel.js is loaded before main.js');
  }
}

// Call initializeMap when the window has finished loading
window.addEventListener('load', initializeMap);

function loadHouses(locations) {
  if (locations.length === 0) {
    map.setView(defaultLocation, defaultZoom);
    return;
  }
  
  locations.forEach((locationData) => {
    const location = new LocationModel(locationData);
    arrayOfLatLngs.push(L.latLng(location.latitude, location.longitude));
    const marker = L.marker([location.latitude, location.longitude], {
      icon: getIconForLocation(location),
      zIndexOffset: getZIndexForLocation(location)
    })
      .addTo(map)
      .bindPopup(() => generatePopupForLocation(location));
    
    marker.location = location; // Store the location data with the marker
  });
  
  if (arrayOfLatLngs.length > 0) {
    let bounds = L.latLngBounds(arrayOfLatLngs);
    map.fitBounds(bounds);
  } else {
    map.setView(defaultLocation, defaultZoom);
  }
}

function generatePopupForLocation(location) {
  let popupContent = `<div style="min-width: 200px;">`;
  popupContent += `<b>${location.address}</b>`;
  
  if (location.route) {
    popupContent += `<br>Route: ${location.route}`;
  }
  
  if (userLocation) {
    const distance = calculateDistance(
      userLocation.lat, userLocation.lng,
      location.latitude, location.longitude
    );
    popupContent += `<br>Distance: ${distance} m`;
  }
  
  popupContent += '<br>';

  // Icon for location type
  let typeIcon = '';
  switch (location.location_type) {
    case "House":
      typeIcon = '<i class="fas fa-home" title="House"></i>';
      break;
    case "Table":
      typeIcon = '<i class="fas fa-table" title="Table"></i>';
      break;
    case "Car":
      typeIcon = '<i class="fas fa-car" title="Car"></i>';
      break;
    case "Parking":
      typeIcon = '<i class="fas fa-parking" title="Parking"></i>';
      break;
    case "Refreshments":
      typeIcon = '<i class="fas fa-coffee" title="Refreshments"></i>';
      break;
  }
  popupContent += `<div style="display: flex; justify-content: space-between;">
    <span>Type: ${location.location_type}</span>
    <span>${typeIcon}</span>
  </div>`;
  
  // Icon for candy availability (only for House, Table, and Car)
  if ((location.location_type === "House" || location.location_type === "Table" || location.location_type === "Car") && location.has_candy !== null) {
    let candyIcon = location.has_candy ? 
      '<i class="fas fa-candy-cane" style="color: green;" title="Has candy"></i>' : 
      '<i class="fas fa-times-circle" style="color: red;" title="No candy"></i>';
    let candyText = location.has_candy ? "Has candy" : "No candy";
    popupContent += `<div style="display: flex; justify-content: space-between;">
      <span>${candyText}</span>
      <span>${candyIcon}</span>
    </div>`;
  }
  
  // Icon for starting point
  if (location.is_start) {
    popupContent += `<div style="display: flex; justify-content: space-between;">
      <span>Starting point</span>
      <span><i class="fas fa-flag-checkered" title="Starting point"></i></span>
    </div>`;
  }
  
  // Activity details
  if (location.has_activity && location.activity_details) {
    popupContent += `<div style="display: flex; justify-content: space-between;">
      <span>Activity</span>
      <span><i class="fas fa-theater-masks" title="Has activity"></i></span>
    </div>`;
    popupContent += `<div style="font-style: italic; margin-top: 5px;">${location.activity_details}</div>`;
  }
  
  if (location.phone_number) {
    popupContent += `<div style="display: flex; justify-content: space-between;">
      <span>Configure</span>
      <span><i class="fas fa-cog" style="cursor: pointer;" onclick="openConfigPage('${location.id}')" title="Configure"></i></span>
    </div>`;
  }
  
  popupContent += '</div>'; // Close the main container div
  
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
    case "Car":
      zIndex = 7;
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
    map.removeLayer(lightTiles);
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

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in meters
  return Math.round(distance); // Round to nearest meter
}

function updateAllPopups() {
  map.eachLayer(layer => {
    if (layer instanceof L.Marker && !(layer === userMarker)) {
      layer.getPopup().setContent(generatePopupForLocation(layer.location));
    }
  });
}

// Add these functions at the beginning of the file, after the existing cookie functions

function showModal() {
  document.getElementById('infoModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
}

function hideModal() {
  document.getElementById('infoModal').classList.add('hidden');
  document.body.style.overflow = ''; // Restore scrolling
}

function setModalShownCookie() {
  setCookie('modalShown', 'true', 365); // Set cookie for 1 year
}

function hasModalBeenShown() {
  return getCookie('modalShown') === 'true';
}

// Add this code at the end of the file

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('infoModal');
  const closeBtn = modal.querySelector('.close');
  const showInfoBtn = document.getElementById('showInfoModal');

  // Show modal on first visit
  if (!hasModalBeenShown()) {
    showModal();
    setModalShownCookie();
  }

  // Close modal when clicking the close button
  closeBtn.onclick = function() {
    hideModal();
  }

  // Close modal when clicking outside of it
  window.onclick = function(event) {
    if (event.target == modal) {
      hideModal();
    }
  }

  // Show modal when clicking the info button
  showInfoBtn.onclick = function() {
    showModal();
  }

  // Add touch event for mobile devices
  modal.addEventListener('touchstart', function(event) {
    if (event.target == modal) {
      hideModal();
    }
  });

  // Prevent scrolling on modal content from closing the modal
  modal.querySelector('.modal-content').addEventListener('touchmove', function(event) {
    event.stopPropagation();
  });
});
