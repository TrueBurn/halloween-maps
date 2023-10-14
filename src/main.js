const { createClient } = supabase

const _supabaseClient = createClient(config.supabase.url, config.supabase.anon_token)

let getLocations = async () => {
    const { data, error } = await _supabaseClient
        .from('location')
        .select('*')
    if (error) console.log('error', error)
    loadHouses(data)
    // console.log('data', data)
}

console.log('Supabase Instance: ', _supabaseClient)

const uitzichtCenter = config.default.location;

var map = L.map('map', {
    center: uitzichtCenter,
    zoom: 16
});

console.log('map', map)

// map.setOptions({ styles: config.gMaps.styles.default })

var roads = L.gridLayer
	.googleMutant({
		type: "roadmap", // valid values are 'roadmap', 'satellite', 'terrain' and 'hybrid'
        styles: config.gMaps.styles.hide,
	})
	.addTo(map);


 var PumpkinIcon = L.Icon.extend({
    options: {
        iconSize:     [45, 45],
        // iconAnchor:   [22, 94],
        // shadowAnchor: [4, 62],
        // popupAnchor:  [-3, -76]
    }
 });
 

var houseIcon = new PumpkinIcon({iconUrl: 'assets/pumpkin.png'});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 15,
    attribution: '© OpenStreetMap'
}).addTo(map);

map.locate({setView: true, maxZoom: 16});

function onLocationFound(e) {
    var radius = e.accuracy;

    L.marker(e.latlng)
        .addTo(map)
        .bindPopup("You are within " + radius + " meters from this point")
        .openPopup();

    // L.circle(e.latlng, radius).addTo(map);
}

map.on('locationfound', onLocationFound);

function onLocationError(e) {
    alert(e.message);
    map.setView(uitzichtCenter, 16);
}

map.on('locationerror', onLocationError);

getLocations()

// fetch('./data/houses.json')
//     .then((response) => response.json())
//     .then((json) => loadHouses(json));

function loadHouses(locations) {
    locations.forEach(location => {
        L.marker([location.latitude, location.longitude], {icon: houseIcon})
            .addTo(map)
            .bindPopup(location.address);
    });
}