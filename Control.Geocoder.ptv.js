if(!L.Control.Geocoder) {L.Control.Geocoder = {};}

L.Control.Geocoder.Ptv = L.Class.extend({
	options: {
		// xLocate url
		serviceUrl: 'https://xlocate-eu-n-test.cloud.ptvgroup.com/xlocate/rs/XLocate/',
		// token for xServer internet
		token: '',
		// predefines the country for single-field search
		fixedCountry: ''
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	runRequest: function (url, request, token, handleSuccess, handleError) {
		$.ajax({
			url: url,
			type: 'POST',
			data: JSON.stringify(request),

			headers: function() {
				var h = {'Content-Type': 'application/json'}; 
				if(token) h['Authorization'] = 'Basic ' + btoa('xtok:' + token);
				return h;
			}(),

			success: function (data, status, xhr) {
				handleSuccess(data);
			},

			error: function (xhr, status, error) {
				handleError(xhr);
			}
		});
	},

	_buildAddressString: function (address) {
		var street = (address.street + ' ' + address.houseNumber).trim();
		var city = (address.postCode + ' ' + address.city).trim();
		//city = (address.state + ' ' + city).trim();
		//if (!this.options.fixedCountry) {
		//	city = (address.country + ' ' + city).trim();
		//}

		if (!street) {
			return city;
		}
		else if (!city) {
			return street;
		}
		else {
			return street + ', ' + city;
		}
	},

	// using standard xLocate geocoding as suggest/autocompletion
	suggest: function(query, cb, context) {
		return this.geocode(query, cb, context);
	},

	geocode: function (query, cb, context) {
		var url = this.options.serviceUrl + 'findAddressByText';

		var request = {
			address: query,
			country: this.options.fixedCountry,
			options: [],
			sorting: [],
			additionalFields: [],
			callerContext: {
				properties: [
				{
					  key: 'CoordFormat',
					  value: 'OG_GEODECIMAL'
				},
				{
					  key: 'Profile',
					  value: 'default'
				}]
			}
		};

		this.runRequest(url, request, this.options.token,
			L.bind(function (response) {
				var results = [];
				for (var i = response.resultList.length - 1; i >= 0; i--) {
					var resultAddress = response.resultList[i];
					var loc = L.latLng(resultAddress.coordinates.point.y, resultAddress.coordinates.point.x);
					results[i] = {
						name: this._buildAddressString(resultAddress),
						center: loc,
						bbox: L.latLngBounds(loc, loc)
					};
				}
				cb.call(context, results);
			}, this),

			function (xhr) {
				console.log(xhr);
			}
		);
	},

    // reverse locating is not supported for China. Just return the (chinese) coordinates
	reverse: function (location, scale, cb, context) {
	    cb.call(context, [{
	        name: 'CN-' + location,
	        center: location,
	        bounds: L.latLngBounds(location, location)
	    }]);
	}
});

L.Control.Geocoder.ptv = function (options) {
	return new L.Control.Geocoder.Ptv(options);
};
