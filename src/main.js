const { createClient } = supabase;

const _supabaseClient = createClient(
  config.supabase.url,
  config.supabase.anon_token
);

let arrayOfLatLngs = [];
let userMarker;

// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13);

// Create both light and dark tile layers
const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
});

const darkTiles = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
  attribution: '© Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors'
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
    .select()
    .eq("is_participating", true);
  if (error) console.log("error", error);
  loadHouses(data);
  // console.log('data', data)
};

getLocations();

function loadHouses(locations) {
  locations.forEach((location) => {
    arrayOfLatLngs.push(L.latLng(location.latitude, location.longitude));
    L.marker([location.latitude, location.longitude], {
      icon: getIconForLocation(location),
      zIndexOffset: getZIndexForLocation(location)
    })
      .addTo(map)
      .bindPopup(generatePopupForLocation(location));
  });
  let bounds = L.latLngBounds(arrayOfLatLngs);
  map.fitBounds(bounds);
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
  let locationPopup = "";
  locationPopup += `<strong>Type: </strong>${location.location_type}`;
  locationPopup += `<br /><strong>Address: </strong>${location.address}`;
  if (location.is_start) {
    locationPopup += `<br /><strong>Starting point for route: </strong>${location.route}`;
  }
  return locationPopup;
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
  localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  
  if (document.documentElement.classList.contains('dark')) {
    map.removeLayer(lightTiles);
    darkTiles.addTo(map);
  } else {
    map.removeLayer(darkTiles);
    lightTiles.addTo(map);
  }
  
  updateThemeIcon();
}

// Initial icon update
updateThemeIcon();

// Set initial map tiles based on current theme
if (document.documentElement.classList.contains('dark')) {
  darkTiles.addTo(map);
} else {
  lightTiles.addTo(map);
}

themeToggle.addEventListener('click', toggleTheme);
