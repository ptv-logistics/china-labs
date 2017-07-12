var buildD3Animations = function (map, alts, replaySpeed, doLoop) {
    // store the map within the closure
    var map = map;

    // already initialized?
    if (!map.d3Layer) {
        // create a separate pane for the svg
        map.createPane('svgPane');
        map.getPane('svgPane').style.zIndex = 600;
        map.getPane('svgPane').style.pointerEvents = 'none';

        var d3Layer = [new Array(3)];

        // put the 'slowest' trace on top
        d3Layer[2] = L.svgLayer({
            pointerEvents: 'none',
            pane: map._panes.svgPane
        }).addTo(map);
        d3Layer[0] = L.svgLayer({
            pointerEvents: 'none',
            pane: map._panes.svgPane
        }).addTo(map);
        d3Layer[1] = L.svgLayer({
            pointerEvents: 'none',
            pane: map._panes.svgPane
        }).addTo(map);

        map.d3Layer = d3Layer;
    } else
        d3Layer = map.d3Layer;

    // cancel pending animations
    for (var i = 0; i < 3; i++) {
        var animId = 'anim' + i;
        d3.select('#tr' + animId).transition().duration(0);
    }

    if (map.timeOut) {
        clearTimeout(map.timeOut);
        map.timeOut = null;
    }

    if (doLoop) {
        var maxTime = -1;
        for (var i = 0; i < alts.length; i++) {
            if (!alts[i])
                continue;

            var t = alts[i].segments[alts[i].segments.length - 1].accTime;

            if (t > 1000000000)
                continue;

            maxTime = Math.max(maxTime, t);
        }

        map.timeOut = setTimeout(function () {
            buildD3Animations(alts, replaySpeed, doLoop);
        }, maxTime / replaySpeed * 1000);
    }

    for (var i = 0; i < alts.length; i++) {
        var svg = d3.select(d3Layer[i].getPathRoot());
        buildD3Animation(alts[i], i, d3Layer[i], svg, replaySpeed);
    }

    function buildD3Animation(route, index, layer, svg, replaySpeed) {
        if (!route)
            return;

        // when the user zooms in or out you need to reset the view
        layer.resetSvg = reset;

        var sumTime = route.segments[route.segments.length - 1].accTime;
        var sumDist = route.segments[route.segments.length - 1].accDist;

        var animId = 'anim' + index;

        var g = svg.append('g')
            .attr('id', animId);


        var features = [];
        //read in the GeoJSON. This function is asynchronous so
        // anything that needs the json file should be within

        for (var i = 0; i < route.polygon.lineString.points.length; i++) {
            features[i] = {
                type: 'feature',
                properties: {
                    time: i + 1,
                    name: i + 1,
                    id: 'route' + i
                },
                geometry: {
                    type: 'Point',
                    coordinates: [route.polygon.lineString.points[i].x, route.polygon.lineString.points[i].y]
                }
            };
        }

        // this is not needed right now, but for future we may need
        // to implement some filtering. This uses the d3 filter function
        // featuresdata is an array of point objects
        var featuresdata = features.filter(function (d) {
            return true; // d.properties.id == "route1";
        });

        // Here we're creating a FUNCTION to generate a line
        // from input points. Since input points will be in
        // Lat/Long they need to be converted to map units
        // with applyLatLngToLayer
        var toLine = d3.svg.line()
            //.interpolate("linear")
            .x(function (d) {
                return applyLatLngToLayer(d).x;
            })
            .y(function (d) {
                return applyLatLngToLayer(d).y;
            });


        // From now on we are essentially appending our features to the
        // group element. We're adding a class with the line name
        // and we're making them invisible

        // Here we will make the points into a single
        // line/path. Note that we surround the featuresdata
        // with [] to tell d3 to treat all the points as a
        // single line. For now these are basically points
        // but below we set the "d" attribute using the
        // line creator function from above.
        var linePath = g.selectAll('.lineConnect')
            .data([featuresdata])
            .enter()
            .append('path')
            .attr('id', 'tr' + animId)
            .attr('class', 'lineConnect')
            .style({
                'stroke': 'Blue',
                'fill': 'none',
                'stroke-width': '6px'
            })
            .style('opacity', '.6');

        // This will be our traveling circle it will
        // travel along our path
        var marker = g.append('circle')
            .attr('r', (index == 0) ? 12 : 10)
            .attr('id', 'marker' + index)
            .attr('class', 'travelMarker' + index);

        // this puts stuff on the map!
        reset();
        transition();

        // Reposition the SVG to cover the features.
        function reset() {
            // the starting point
            marker.attr('transform',
                function () {
                    var y = featuresdata[0].geometry.coordinates[1];
                    var x = featuresdata[0].geometry.coordinates[0];
                    return 'translate(' +
                        map.latLngToLayerPoint(L.latLng(y, x)).x + ',' +
                        map.latLngToLayerPoint(L.latLng(y, x)).y + ')';
                });

            // linePath.attr("d", d3path);
            linePath.attr('d', toLine);

        } // end reset

        // the transition function could have been done above using
        // chaining but it's cleaner to have a separate function.
        // the transition. Dash array expects "500, 30" where
        // 500 is the length of the "dash" 30 is the length of the
        // gap. So if you had a line that is 500 long and you used
        // "500, 0" you would have a solid line. If you had "500,500"
        // you would have a 500px line followed by a 500px gap. This
        // can be manipulated by starting with a complete gap "0,500"
        // then a small line "1,500" then bigger line "2,500" and so
        // on. The values themselves ("0,500", "1,500" etc) are being
        // fed to the attrTween operator
        function transition() {
            linePath.transition()
                .duration(sumTime * 1000 / replaySpeed)
                .ease('linear')
                .attrTween('stroke-dasharray', tweenDash)
                .each('interrupt', function () {
                    d3.select('#' + animId).remove();
                })
                .each('end', function () {
                    //              d3.select(this).call(transition);// infinite loop
                    d3.select('#' + animId).remove();
                });
        } //end transition

        // get the first(!) index where the accTime is greater the searchelement 
        function binaryIndexOf(segments, searchElement) {
            var minIndex = 0;
            var maxIndex = segments.length - 1;
            var currentIndex;
            var currentElement;

            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0;
                currentElement = segments[currentIndex].accTime;

                if (currentElement < searchElement) {
                    minIndex = currentIndex + 1;
                } else if (
                    currentElement >= searchElement &&
                    (currentIndex > 0 && segments[currentIndex - 1].accTime >= searchElement)) {
                    maxIndex = currentIndex - 1;
                } else {
                    return currentIndex;
                }
            }

            return -1;
        }

        function getRelTimeOnSegment(route, rTime) {
            // find the (first) index where the accumlated segment time is greater
            var i = binaryIndexOf(route.segments, rTime);

            // get the relative distance 
            var xt = (i == 0) ? 0 : route.segments[i - 1].accTime;
            var xd = (i == 0) ? 0 : route.segments[i - 1].accDist;
            var dt = rTime - xt;

            var at = route.segments[i].accTime - xt;
            var rt = dt / at;

            var ad = route.segments[i].accDist - xd;
            var rd = ad * rt;

            return (xd + rd) / sumDist;

            // experimental: amplify the speed difference
            // var rrr1 = (rTime / sumTime);
            // var rrr2 = (xd + rd) / sumDist;
            // var elevation = 1.2;
            // var rrr = (elevation * rrr2 + (1 - elevation ) * rrr1);
            // return rrr;
        }

        // this function feeds the attrTween operator above with the
        // stroke and dash lengths
        function tweenDash() {
            return function (t) {
                //total length of path (single value)
                var l = linePath.node().getTotalLength();

                // the relatibe time
                var rTime = t * sumTime;

                var t = getRelTimeOnSegment(route, rTime);

                // this is creating a function called interpolate which takes
                // as input a single value 0-1. The function will interpolate
                // between the numbers embedded in a string. An example might
                // be interpolatString("0,500", "500,500") in which case
                // the first number would interpolate through 0-500 and the
                // second number through 500-500 (always 500). So, then
                // if you used interpolate(0.5) you would get "250, 500"
                // when input into the attrTween above this means give me
                // a line of length 250 followed by a gap of 500. Since the
                // total line length, though is only 500 to begin with this
                // essentially says give me a line of 250px followed by a gap
                // of 250px.
                var interpolate = d3.interpolateString('0,' + l, l + ',' + l);

                //t is fraction of time 0-1 since transition began
                var marker = d3.select('#marker' + index);

                // p is the point on the line (coordinates) at a given length
                // along the line. In this case if l=50 and we're midway through
                // the time then this would 25.
                var p = linePath.node().getPointAtLength(t * l);

                //Move the marker to that point
                marker.attr('transform', 'translate(' + p.x + ',' + p.y + ')'); //move marker
                //console.log(t + " " + l + " " + interpolate(t))
                return interpolate(t);
            };
        } //end tweenDash

        // similar to projectPoint this function converts lat/long to
        // svg coordinates except that it accepts a point from our
        // GeoJSON
        function applyLatLngToLayer(d) {
            var y = d.geometry.coordinates[1];
            var x = d.geometry.coordinates[0];
            return map.latLngToLayerPoint(L.latLng(y, x));
        }
    }
};