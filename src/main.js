const uitzichtCenter = [-33.819689, 18.688568];

var map = L.map('map', {
    center: uitzichtCenter,
    zoom: 16
});

var roads = L.gridLayer
	.googleMutant({
		type: "roadmap", // valid values are 'roadmap', 'satellite', 'terrain' and 'hybrid'
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
    maxZoom: 20,
    attribution: '© OpenStreetMap'
}).addTo(map);

fetch('./data/houses.json')
    .then((response) => response.json())
    .then((json) => loadHouses(json));

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

var loadHouses = function(houses) {
    houses.forEach(house => {
        L.marker([house.lat, house.long], {icon: houseIcon}).addTo(map).bindPopup(house.address);
    });
}