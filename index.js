var cluster = '-test';

$.urlParam = function(name){
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null){
       return null;
    }
    else{
       return results[1] || 0;
    }
}

if($.urlParam('xtok'))
	token = $.urlParam('xtok');

//handle authentication 
if (!token) {
	var test = $('#Auth').dialog({ minWidth: 600, minHeight: 400 });
} else {
    init();
}

function handleAuth(elmnt,clr) {
    token = document.getElementById("tokenInput").value;
	
	var url = 'https://china' + cluster + '.ptvgroup.cn/WMS/WMS?service=WMS&request=GetMap&version=1.1.1&layers=xmap-gravelpit-fg&styles=&format=image%2Fpng&transparent=true&srs=EPSG%3A3857&width=600&height=400&bbox=933672,6275665,937081,6277938&xtok=' + token;
	document.getElementById("error").innerHTML = "Loading...";
	httpAsync(url, function(res) {
		if (res == 200) {
			$('#Auth').dialog('close');
			init();
		} else {
			document.getElementById("error").innerHTML = "Invalid token";
		}
	});
}

//run a request
function httpAsync(theUrl, callback) {
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() { 
        if (req.readyState == 4)
            callback(req.status);
    }
    req.open("GET", theUrl, true);
    req.send(null);
}


function init() {	var itineraryLanguage = 'EN';
	var routingProfile = 'carfast';
	var alternativeRoutes = 0;

	// The start and destination coordinates referring to WGS84
	var coordinates = [
		{ "latitude": 31.22942, "longitude": 121.47457 },
		{ "latitude": 39.92132, "longitude": 116.46614 }
	];

	if($.urlParam('profile')) routingProfile = $.urlParam('profile');
	if($.urlParam('lat1')) coordinates[0].latitude = parseFloat($.urlParam('lat1'));
	if($.urlParam('lng1')) coordinates[0].longitude = parseFloat($.urlParam('lng1'));
	if($.urlParam('lat2')) coordinates[1].latitude = parseFloat($.urlParam('lat2'));
	if($.urlParam('lng2')) coordinates[1].longitude = parseFloat($.urlParam('lng2'));

	// xServer-cn uses a special datum for china. You have to transform your coordinates before calculating the route.
	$.ajax({
		url: 'https://china' + cluster + '.ptvgroup.cn/CoordinateTransformation/shift',
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
		var attribution = '<a href="http://www.ptvgroup.com">PTV</a>, eMapgo';

		var background = L.tileLayer('https://china{s}' + cluster + '.ptvgroup.cn/WMS/GetTile/xmap-' + 
			style + 'bg/{x}/{y}/{z}.png', {
			minZoom: 0, maxZoom: 19, opacity: 1.0,
			attribution: attribution,
			subdomains: '1234'
		});

		var foreground = new L.NonTiledLayer.WMS('https://china' + cluster + '.ptvgroup.cn/WMS/WMS?xtok=' + token, {
			minZoom: 0, maxZoom: 19, opacity: 1.0,
			layers: 'xmap-' + style + 'fg',
			format: 'image/png', transparent: true,
			attribution: attribution,
			pane: 'labels'
		});

		return L.layerGroup([background, foreground]);
	}

// create a separate pane for the xmap labels, so they are displayed on top of the route line
map.createPane('labels');
map.getPane('labels').style.zIndex = 500;
map.getPane('labels').style.pointerEvents = 'none';

	var baseLayers = {
		"PTV classic": getXMapBaseLayers('ajax', token, map._panes.labelPane),
		"PTV gravelpit": getXMapBaseLayers('gravelpit-', token, map._panes.labelPane),
		"PTV silkysand": getXMapBaseLayers('silkysand-', token, map._panes.labelPane).addTo(map),
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
    	            icon: L.icon.glyph({
	                    glyph: String.fromCharCode(65 + i)
        	        })
    	        });
	        },
			geocoder: L.Control.Geocoder.ptv({
				serviceUrl: 'https://china' + cluster + '.ptvgroup.cn/xlocate/rs/XLocate/',
				token: token
			}),
			reverseWaypoints: true
		}),
		lineOptions: {
			styles: [
			  // Shadow
			  { color: 'black', opacity: 0.8, weight: 11 },
			  // Outline
			  { color: '#888', opacity: 0.8, weight: 8 },
			  // Center
			  { color: '#aaa', opacity: 1, weight: 4 }
			]
		},
		altLineOptions: {
			styles: [
				{color: 'grey', opacity: 0.8, weight: 11},
				{color: '#aaa', opacity: 0.8, weight: 8},
				{color: 'white', opacity: 1, weight: 4}
			],
		},
		showAlternatives: true,	
		router: L.Routing.ptv({
			serviceUrl: 'https://china' + cluster + '.ptvgroup.cn/xroute/rs/XRoute/',
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
				buildD3Animations(map, r, 8000, false);
			}
		}),
		routeWhileDragging: false,
		routeDragInterval: 500
	}).addTo(map);

	routingControl.on('routingerror', function (e) {
		console.log(e.error.message);
	});

	L.Routing.errorControl(routingControl).addTo(map);

	// update ui
	$('#languageSelect').val(itineraryLanguage);
	$('#routingProfile').val(routingProfile);
	$('#alternativeRoutes').val(alternativeRoutes);

	// add side bar
	var sidebar = L.control.sidebar('sidebar').addTo(map);

	// update the routing params
	updateParams = function (updateWayPoints) {
		itineraryLanguage = $('#languageSelect option:selected').val();
		routingProfile = $('#routingProfile option:selected').val();
		alternativeRoutes = $('#alternativeRoutes option:selected').val();
		   
		routingControl._router.options.numberOfAlternatives = alternativeRoutes;
		routingControl.route();
	};

}

