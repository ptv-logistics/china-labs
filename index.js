if (!token) {
    alert('you need a token to run the sample!');
}

var cluster = '-hk-test';
var itineraryLanguage = 'EN';
var routingProfile = 'carfast';
var alternativeRoutes = 0;

// The start and destination coordinates referring to WGS84
var coordinates = [
    { "latitude": 31.22942, "longitude": 121.47457 },
    { "latitude": 39.92132, "longitude": 116.46614 }
];

// xServer-cn uses a special datum for china. You have to transform your coordinates before calculating the route.
$.ajax({
    url: 'https://china' + cluster + '.cloud.ptvgroup.com/CoordinateTransformation/shift',
    type: 'POST',
    data: JSON.stringify(coordinates),
    contentType: "application/json",
    success: function (data, status, xhr) {
        var waypoints = [];
        for(var i = 0; i < data.length; i++) {
            waypoints.push(L.latLng(data[i].latitude, data[i].longitude));
        }
        map.fitBounds(L.latLngBounds(waypoints));
        routingControl.setWaypoints(waypoints);
    },
    error: function (xhr, status, error) {
        alert(xhr);
    }
});

// initialize the map
var map = L.map('map', {
    contextmenu: true,
    contextmenuWidth: 200,
    contextmenuItems: [
    {
        text: 'Add Waypoint At Start',
        callback: function (ev) {
            if (routingControl._plan._waypoints[0].latLng) {
                routingControl.spliceWaypoints(0, 0, ev.latlng);
            } else {
                routingControl.spliceWaypoints(0, 1, ev.latlng);
            }
        }
    }, {
        text: 'Add Waypoint At End',
        callback: function (ev) {
            if (routingControl._plan._waypoints[routingControl._plan._waypoints.length - 1].latLng) {
                routingControl.spliceWaypoints(routingControl._plan._waypoints.length, 0, ev.latlng);
            } else {
                routingControl.spliceWaypoints(routingControl._plan._waypoints.length - 1, 1, ev.latlng);
            }
        }
    }]
});

// returns a layer group for xmap back- and foreground layers
function getXMapBaseLayers(style, token, labelPane) {
    var attribution = '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM';

    var background = L.tileLayer('https://china' + cluster + '.cloud.ptvgroup.com/WMS/GetTile/xmap-' + 
        style + 'bg/{x}/{y}/{z}.png', {
        minZoom: 0, maxZoom: 19, opacity: 1.0,
        attribution: attribution
    });

    var foreground = new L.NonTiledLayer.WMS('https://china' + cluster + '.cloud.ptvgroup.com/WMS/WMS?xtok=' + token, {
        minZoom: 0, maxZoom: 19, opacity: 1.0,
        layers: 'xmap-' + style + 'fg',
        format: 'image/png', transparent: true,
        attribution: attribution,
        pane: labelPane
    });

    return L.layerGroup([background, foreground]);
}

// create a new leaflet pane for the label layer
// see http://bl.ocks.org/rsudekum/5431771
map._panes.labelPane = map._createPane('leaflet-top-pane', map.getPanes().shadowPane);

var baseLayers = {
    "PTV classic": getXMapBaseLayers('ajax', token, map._panes.labelPane).addTo(map),
    "PTV gravelpit": getXMapBaseLayers('gravelpit-', token, map._panes.labelPane),
    "PTV silkysand": getXMapBaseLayers('silkysand-', token, map._panes.labelPane),
    "PTV sandbox": getXMapBaseLayers('sandbox-', token, map._panes.labelPane)
};

L.control.scale().addTo(map);
L.control.layers(baseLayers, {}, { position: 'bottomleft' }).addTo(map);

var routingControl = L.Routing.control({
    plan: L.Routing.plan({},
    {
        createMarker: function (i, wp) {
            return L.marker(wp.latLng, {
                draggable: true,
                icon: new L.Icon.Label.Default({ labelText: String.fromCharCode(65 + i) })
            });
        },
        geocoder: L.Control.Geocoder.ptv({
            serviceUrl: 'https://china' + cluster + '.cloud.ptvgroup.com/xlocate/rs/XLocate/',
            token: token
        }),
        reverseWaypoints: true
    }),
    lineOptions: {
        styles: [
          // Shadow
          { color: 'black', opacity: 0.8, weight: 11 },
          // Outline
          { color: 'green', opacity: 0.8, weight: 8 },
          // Center
          { color: 'orange', opacity: 1, weight: 4 }
        ]
    },
    altLineOptions: {
        styles: [
            {color: 'black', opacity: 0.8, weight: 11},
            {color: 'lightgreen', opacity: 0.8, weight: 8},
            {color: 'orange', opacity: 1, weight: 4}
        ],
	},
    showAlternatives: true,	
    router: L.Routing.ptv({
        serviceUrl: 'https://china' + cluster + '.cloud.ptvgroup.com/xroute/rs/XRoute/',
        token: token, 
        numberOfAlternatives: alternativeRoutes,
        beforeSend: function (request) {
            request.options.push({
                parameter: 'ROUTE_LANGUAGE',
                value: itineraryLanguage
            });

            request.callerContext.properties.push({ key: 'Profile', value: routingProfile });

            return request;
        },
		routesCalculated: function (alts, r) {
			buildD3Animations(r, 1000, false);
		}
    }),
    routeWhileDragging: false,
    routeDragInterval: 500
}).addTo(map);

routingControl.on('routingerror', function (e) {
	console.log(e.error.message);
	buildD3Animations([], 1000, false);
});

// update ui
$('#languageSelect').val(itineraryLanguage);
$('#routingProfile').val(routingProfile);
$('#alternativeRoutes').val(alternativeRoutes);

// add side bar
var sidebar = L.control.sidebar('sidebar').addTo(map);
sidebar.open('home');

// update the routing params
var updateParams = function (updateWayPoints) {
	buildD3Animations([], 1000, false);

    itineraryLanguage = $('#languageSelect option:selected').val();
    routingProfile = $('#routingProfile option:selected').val();
    alternativeRoutes = $('#alternativeRoutes option:selected').val();
       
    routingControl._router.options.numberOfAlternatives = alternativeRoutes;
    routingControl.route();
};
