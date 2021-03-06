# leaflet-routing-machine for PTV xServer
This project shows how to use https://www.liedman.net/leaflet-routing-machine/ with PTV xServer and china map.

Demo: https://ptv-logistics.github.io/china-labs/

To use this code, you need an installed PTV xRoute/xLocate/xMap or an xServer internet subscription. Go to https://xserver.ptvgroup.com/en-uk/products/ptv-xserver-internet/test/ to get a trial token.

## Coordinate Transformation:
Chinese legislation requires that all digital map data is stored in China in a specific coordinate system. To transform your coordinates to this system, we are providing a coordinate transformation service from WGS84 to chinese proprietary coordinate system. You will find further informations in this following documentation:
https://china.ptvgroup.cn/CoordinateTransformation

The additional classes required to use PTV xServer with leaflet-routing-machine:

## L.NonTiledLayer.WMS
Provides an implementation to support single-tile WMS layers for Leaflet, similar to L.TileLayer.WMS. This is required to add xMapServer content as Leaflet layer. See here for details: https://github.com/ptv-logistics/Leaflet.NonTiledLayer

## L.Control.Geocoder.Ptv
The PTV xLocate implementation of the geocoder for routing-machine.

Supported options:
* *serviceUrl* - The url for PTV xLocate. 
* *token* - The token for xServer internet access. Default: ''
* *fixedCountry* - A country that can be predefined for single-field search

## L.Routing.Ptv
The PTV xRoute implementation of the router for routing-machine.

Supported options:
* *serviceUrl* - The url for PTV xRoute.
* *token* - The token for xServer internet access. Default: ''
* *supportsHeadings* - indicates the back-end is a real xServer that supports heading informations. Default: true
* *numberOfAlternatives* - Number of alternatives to calculate. Default: 0
* *beforeSend* - A delegate to manipulate the sent request. Default: null

## animatedLine.js

The sample also visualizes the relative speeds with a snake animation. This is done with SVG+D3 based on the xRoute segment speeds.
