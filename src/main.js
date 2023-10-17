const { createClient } = supabase;

const _supabaseClient = createClient(
  config.supabase.url,
  config.supabase.anon_token
);

let arrayOfLatLngs = [];

let map = L.map("map", {
  center: config.default.location,
  zoom: 16,
});

let roads = L.gridLayer
  .googleMutant({
    type: "roadmap", // valid values are 'roadmap', 'satellite', 'terrain' and 'hybrid'
    styles: config.gMaps.styles.hide,
  })
  .addTo(map);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 15,
  attribution: "© OpenStreetMap",
}).addTo(map);

function onLocationFound(e) {
  var radius = e.accuracy;

  L.marker(e.latlng)
    .addTo(map)
    .bindPopup("You are within " + radius + " meters from this point");
  // .openPopup();

  // L.circle(e.latlng, radius).addTo(map);
}

function onLocationError(e) {
  console.error(e.message);
  // map.setView(config.default.location, 16);
}

map.on("locationfound", onLocationFound);
map.on("locationerror", onLocationError);

map.locate({ setView: false, watch: true, maxZoom: 16 });

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
let tableIcon = new participatingIcon({ 
  iconUrl: "assets/table.png",
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
  console.log('data', data)
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
      icon = location.has_candy ? houseIcon : houseWithNoCandyIcon;
      break;
    case "Table":
      icon = location.has_candy ? tableIcon : tableWithNoCandyIcon;
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
  return locationPopup;
}

function getZIndexForLocation(location) {
  let zIndex = 0;
  switch (location.location_type) {
    case "House":
      zIndex = 10;
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
  if (location.location_type === "House") {
    zIndex = 10;
  }
  return zIndex;
}
