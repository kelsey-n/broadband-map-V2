var beforeMap = new mapboxgl.Map({
    container: 'before',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    bounds: [[-80.00125, 40.40703], [-71.64066, 45.08304]] // so initial queryRenderedFeatures will capture all tracts
});

var afterMap = new mapboxgl.Map({
    container: 'after',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    bounds: [[-80.00125, 40.40703], [-71.64066, 45.08304]]
});

// A selector or reference to HTML element
var container = '#comparison-container';

var map = new mapboxgl.Compare(beforeMap, afterMap, container);

// Add navigation control:
afterMap.addControl(new mapboxgl.NavigationControl({
  showCompass: false
}));

// enable tooltips
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

// variables to hold and edit our color schemes
var sequential_colors = ['#8A8AFF','#5C5CFF','#2E2EFF','#0000FF','#0000A3']; //blue TRY VARYING SATURATION
var diverging_colors = ['#d7191c','#fdae61','#ffffbf','#a6d96a','#1a9641'] //red --> green

// 'column name in data': 'display value for frontend of visualization'
var colName_to_displayVal = {
  'Wired 25 (BN)': 'wired25_3_2020_bn',
  'Wired 100 (BN)': 'wired100_3_2020_bn',
  //'averagembps_bn': 'Average Speed (BN)',
  //'fastestaveragembps_bn': 'Fastest Average Speed (BN)',
  //'lowestpricedterrestrialbroadbandplan_bn': 'Lowest Priced Terrestrial Plan (BN)',
  'Broadband Usage (MS)': 'broadbandusage_ms',
  'Average Throughput (ML)': 'avg_meanthroughputmbps_ml',
  'Number of Speed Tests (ML)': 'speedtests_ml',
  'Average Weighted Download Speed (Ook)': 'avgwt_downloadspeed_ook',
  'Average Weighted Upload Speed (Ook)': 'avgwt_uploadspeed_ook',
  'Number of Speed Tests (Ook)': 'speedtests_ook',
  'Number of Internet Providers (FCC)': 'numproviders_fcc',
  'Average Fraction Coverage (FCC)': 'avg_fractioncoverage_fcc',
  'Average Weighted Maximum Advertised Download Speed (FCC)': 'avgwt_maxaddown_fcc',
  'Average Weighted Maximum Advertised Upload Speed (FCC)': 'avgwt_maxadup_fcc',
  'Broadband Score': 'dummy_score_for_testing'
}

// Populate the variable selection dropdowns on the frontend:
$.each(colName_to_displayVal, function(key, value) {
  $('.dropdown-menu').append(`
    <li><a class="dropdown-item" data-value=${value} href="#">${key}</a></li>
    `)
})

// Obj var to hold arrays of all property values
var featuresObj = {};
$.each(colName_to_displayVal, function(key, value) {
  featuresObj[`${value}`] = []
});

// After map loads, qRF to get properties for charts & percentile calcs
afterMap.on('load', function() {
  var testarr = afterMap.queryRenderedFeatures()
  //console.log(testarr)
  var tractset = new Set() //to capture unique tracts since qRF captures dupes
  testarr.forEach((el) => {
    if (!tractset.has(el.properties.censustract)) {
      for (const [key, value] of Object.entries(featuresObj)) {
        featuresObj[`${key}`].push(el.properties[`${key}`])
      };
      tractset.add(el.properties.censustract)
    };
  });
  //console.log(featuresObj); // TO BE REMOVED
});

// Function to determine when the sidenav is open and what it is populated with
function openNav() {
  // Set the width of the side navigation to be viewable at 250px and move the sidenav buttons over 250px:
  document.getElementById("sidenav-menu").style.width = "250px";
  document.getElementById("sidenav-buttons").style.left = "250px";
  // Depending on which sidenav button was clicked, populate the menu with the relevant text
  $('.sidenav-button').click(function() {
    $('.sidenav-button').removeClass('sidenav-button-active'); //remove styling from any previously selected button
    var button_id = $(this).attr('id') //pull out the id name of the clicked sidenav button
    var menu_text = $(`#${button_id}-text`).html(); //get the menu text and styling for the clicked button
    $(".sidenav-menu-text").html(menu_text); //populate the sidenav menu with the appropriate html
    // style the clicked button:
    $(`#${button_id}`).addClass('sidenav-button-active');
  });
}

// Function to close the side navigaion
// Set the width of the side navigation to 0 and the left margin of the page content to 0
function closeNav() {
  document.getElementById("sidenav-menu").style.width = "0";
  document.getElementById("sidenav-buttons").style.left = "0px";
  $('.sidenav-button').removeClass('sidenav-button-active');
}

// Function to calculate percentiles of data
function percentiles(arr) {
  arr.sort(d3.ascending);
  var len = arr.length;
  var per20 =  Math.floor(len*0.2) - 1;
  var per40 =  Math.floor(len*0.4) - 1;
  var per60 =  Math.floor(len*0.6) - 1;
  var per80 =  Math.floor(len*0.8) - 1;
  var percs = [arr[per20], arr[per40], arr[per60], arr[per80]];
  let unique = [...new Set(percs)];
  if (unique.length != 4) {
    percs.forEach(function (perc, i) {
      if (perc == percs[i+1]) {
        percs[i+1] += 0.001
      };
    });
  };
  return percs
}

// Function to draw histogram of selected variables
function createPlot(arr, percentiles) {
  // TO DO: check how mapbox stops works for edge vals!!!! 
  [0,1,2,3].forEach((i) => {
    if (i == 0) {
      window[`x${i}`] = arr.filter(value => value < percentiles[i]);
    } else if (i == 3) {
      window[`x${i}`] = arr.filter(value => value >= percentiles[i-1]);
    } else {
      window[`x${i}`] = arr.filter(value => value >= percentiles[i-1] && value < percentiles[i])
    }

    window[`trace${i}`] = {
      x: window[`x${i}`],
      type: 'histogram',
      marker: {
        color: sequential_colors[i]
      }
    }
  })
  //var x0 = arr.filter(value => value < percentiles[0]);
  //var x1 = arr.filter(value => value >= percentiles[0] && value < percentiles[1]); // TO DO: check how mapbox stops works for edge vals

  // var trace0 = {
  //     x: x0,
  //     type: 'histogram',
  //     marker: {
  //       color: sequential_colors[0]
  //     }
  //   };
  // var trace1 = {
  //     x: x1,
  //     type: 'histogram',
  //     marker: {
  //       color: sequential_colors[1]
  //     }
  //   };

  var data = [trace0, trace1, trace2, trace3];

  var layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    xaxis: {
      tickfont: {
        color: 'white'
      }
    },
    yaxis: {
      tickfont: {
        color: 'white'
      }
    }
  };

  Plotly.newPlot('chart1', data, layout);
}

// variables to hold the user's selection of variables to display:
var first_var = 'Broadband Score';
var second_var = 'Broadband Score';
var firstarr = [];
var secondarr = [];
checkbox = document.getElementById('checkbox');

// this function will update the variable selections on the first dropdown menu for variable selection:
$("#first-dropdown li a").click(function() {
  first_var = $(this).text();
  first_check = true;
  $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');

  firstarr = featuresObj[`${colName_to_displayVal[first_var]}`];
  var testpercentiles = percentiles(firstarr) // TO DELETE
  // create histogram for first variable
  createPlot(firstarr, testpercentiles)

  // show fill layer for first variable
  beforeMap.setLayoutProperty('scores_layer', 'visibility','none');
  beforeMap.setLayoutProperty('first_selected_layer', 'visibility','visible');

  if ($('#checkbox').prop('checked')) {
    combinedarr = firstarr.concat(secondarr);
    var intervals = percentiles(combinedarr);
    console.log(intervals);
    beforeMap.setPaintProperty('first_selected_layer', 'fill-color', [
      'step',
      ['get', colName_to_displayVal[first_var]],
      sequential_colors[0],
      intervals[0], sequential_colors[1],
      intervals[1], sequential_colors[2],
      intervals[2], sequential_colors[3],
      intervals[3], sequential_colors[4],
    ]);
    if (secondarr.length > 0) {
      afterMap.setPaintProperty('second_selected_layer', 'fill-color', [
        'step',
        ['get', colName_to_displayVal[second_var]],
        sequential_colors[0],
        intervals[0], sequential_colors[1],
        intervals[1], sequential_colors[2],
        intervals[2], sequential_colors[3],
        intervals[3], sequential_colors[4],
      ]);
    };
  } else {
    var intervals = percentiles(firstarr);
    console.log(intervals);
    beforeMap.setPaintProperty('first_selected_layer', 'fill-color', [
      'step',
      ['get', colName_to_displayVal[first_var]],
      sequential_colors[0],
      intervals[0], sequential_colors[1],
      intervals[1], sequential_colors[2],
      intervals[2], sequential_colors[3],
      intervals[3], sequential_colors[4],
    ]);
  };
});


// this function will update the variable selections on the second dropdown menu for variable selection:
$("#second-dropdown li a").click(function() {
  second_var = $(this).text() //$(this).data('value') - this is a string AND it is updating the global first_var variable BUT still throwing error when we show the layer... `'${$(this).data('value')}'`
  console.log('global first_var:', first_var)
  console.log(jQuery.type(first_var))
  //console.log(`${first_var}`)
  $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');
  // $(this).parents(".dropdown").find('.btn').val($(this).data('value')); // "allows you to have different display text and data value for each element - from SO"

  secondarr = featuresObj[`${colName_to_displayVal[second_var]}`]

  afterMap.setLayoutProperty('scores_layer', 'visibility','none');
  afterMap.setLayoutProperty('second_selected_layer', 'visibility','visible');

  if ($('#checkbox').prop('checked')) {
    combinedarr = secondarr.concat(firstarr);
    var intervals = percentiles(combinedarr);
    console.log(intervals);
    afterMap.setPaintProperty('second_selected_layer', 'fill-color', [
      'step',
      ['get', colName_to_displayVal[second_var]],
      sequential_colors[0],
      intervals[0], sequential_colors[1],
      intervals[1], sequential_colors[2],
      intervals[2], sequential_colors[3],
      intervals[3], sequential_colors[4],
    ]);
    if (firstarr.length > 0) {
      beforeMap.setPaintProperty('first_selected_layer', 'fill-color', [
        'step',
        ['get', colName_to_displayVal[first_var]],
        sequential_colors[0],
        intervals[0], sequential_colors[1],
        intervals[1], sequential_colors[2],
        intervals[2], sequential_colors[3],
        intervals[3], sequential_colors[4],
      ]);
    };
  } else {
    var intervals = percentiles(secondarr);
    console.log(intervals);
    afterMap.setPaintProperty('second_selected_layer', 'fill-color', [
      'step',
      ['get', colName_to_displayVal[second_var]],
      sequential_colors[0],
      intervals[0], sequential_colors[1],
      intervals[1], sequential_colors[2],
      intervals[2], sequential_colors[3],
      intervals[3], sequential_colors[4],
    ]);
  };
});

// listen for a change to the checkbox
checkbox.addEventListener('change', e => {
    if (e.target.checked) {
      combinedarr = firstarr.concat(secondarr);
      var intervals = percentiles(combinedarr);
      console.log(intervals)
      beforeMap.setPaintProperty('first_selected_layer', 'fill-color', [
        'step',
        ['get', colName_to_displayVal[first_var]],
        sequential_colors[0],
        intervals[0], sequential_colors[1],
        intervals[1], sequential_colors[2],
        intervals[2], sequential_colors[3],
        intervals[3], sequential_colors[4],
      ]);
      afterMap.setPaintProperty('second_selected_layer', 'fill-color', [
        'step',
        ['get', colName_to_displayVal[second_var]],
        sequential_colors[0],
        intervals[0], sequential_colors[1],
        intervals[1], sequential_colors[2],
        intervals[2], sequential_colors[3],
        intervals[3], sequential_colors[4],
      ]);
    };
    if (!e.target.checked) {
      intervals_1 = percentiles(firstarr);
      intervals_2 = percentiles(secondarr);
      console.log(intervals_1)
      console.log(intervals_2)
      beforeMap.setPaintProperty('first_selected_layer', 'fill-color', [
        'step',
        ['get', colName_to_displayVal[first_var]],
        sequential_colors[0],
        intervals_1[0], sequential_colors[1],
        intervals_1[1], sequential_colors[2],
        intervals_1[2], sequential_colors[3],
        intervals_1[3], sequential_colors[4],
      ]);
      afterMap.setPaintProperty('second_selected_layer', 'fill-color', [
        'step',
        ['get', colName_to_displayVal[second_var]],
        sequential_colors[0],
        intervals_2[0], sequential_colors[1],
        intervals_2[1], sequential_colors[2],
        intervals_2[2], sequential_colors[3],
        intervals_2[3], sequential_colors[4],
      ]);
    }
});

// Function to add styling for hovered census tract
beforeMap.on('style.load', function() {

  openNav(); //load welcome message on load

//   // add an empty data source, which we will use to highlight the census tract that the user is hovering over
//   beforeMap.addSource('highlight-tract-source', {
//     type: 'geojson',
//     data: {
//       type: 'FeatureCollection',
//       features: []
//     }
//   });
//
//   // add a layer for the hovered station
//   map.addLayer({
//     id: 'highlight-tract-layer',
//     type: 'fill-extrusion',
//     source: 'highlight-tract-source',
//     paint: {
//       'fill-extrusion-color': [
//         'step',
//         ['get', 'avgwt_downloadspeed_ook'],
//         sequential_colors[0],
//         25, sequential_colors[1],
//         100, sequential_colors[2],
//         200, sequential_colors[3],
//         230, sequential_colors[4],
//       ],
//       'fill-extrusion-height': [
//         'step',
//         ['get', 'avgwt_uploadspeed_ook'],
//         5000,
//         25, 10000,
//         60, 20000,
//         120, 30000,
//         180, 40000
//       ],
//       'fill-extrusion-opacity': 1
//     }
//   });
//
})

const REQUEST_GET_MAX_URL_LENGTH = 2048;

addCartoLayer();

// Function to add layers based on CARTO tiles:
async function addCartoLayer() {
  const tileSourceURLs = await getTileSources();

  beforeMap.addLayer(
    {
      id: 'scores_layer',
      type: 'fill',
      source: {
        type: 'vector',
        tiles: tileSourceURLs
      },
      'source-layer': 'layer0',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'fill-color': [
          'step',
          ['get', 'dummy_score_for_testing'],
          diverging_colors[0],
          2, diverging_colors[1],
          3, diverging_colors[2],
          4, diverging_colors[3],
          5, diverging_colors[4],
        ],
        'fill-opacity': 0.7,
        'fill-outline-color': 'black'
      }
    }
  );

  afterMap.addLayer(
    {
      id: 'scores_layer',
      type: 'fill',
      source: {
        type: 'vector',
        tiles: tileSourceURLs
      },
      'source-layer': 'layer0',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'fill-color': [
          'step',
          ['get', 'dummy_score_for_testing'],
          diverging_colors[0],
          2, diverging_colors[1],
          3, diverging_colors[2],
          4, diverging_colors[3],
          5, diverging_colors[4],
        ],
        'fill-opacity': 0.7,
        'fill-outline-color': 'black'
      }
    }
  );

  beforeMap.addLayer(
    {
      id: 'first_selected_layer',
      type: 'fill',
      source: {
        type: 'vector',
        tiles: tileSourceURLs
      },
      'source-layer': 'layer0',
      layout: {
        'visibility': 'none'
      },
      paint: {
        'fill-color': [
          'step',
          ['get', colName_to_displayVal[first_var]],
          sequential_colors[0],
          25, sequential_colors[1],
          100, sequential_colors[2],
          200, sequential_colors[3],
          230, sequential_colors[4],
        ],
        'fill-opacity': 1,
        'fill-outline-color': 'black'
      }
    }
  );

  afterMap.addLayer(
    {
      id: 'second_selected_layer',
      type: 'fill',
      source: {
        type: 'vector',
        tiles: tileSourceURLs
      },
      'source-layer': 'layer0',
      layout: {
        'visibility': 'none'
      },
      paint: {
        'fill-color': [
          'step',
          ['get', second_var],
          sequential_colors[0],
          25, sequential_colors[1],
          100, sequential_colors[2],
          200, sequential_colors[3],
          230, sequential_colors[4],
        ],
        'fill-opacity': 1,
        'fill-outline-color': 'black'
      }
    }
  );

}

// Function to get tiles from CARTO source
async function getTileSources() {
  const mapConfig = JSON.stringify({
    version: '1.3.1',
    buffersize: {mvt: 1},
    layers: [
      {
        type: 'mapnik',
        options: {
          sql: 'SELECT the_geom_webmercator, censustract, wired25_3_2020_bn, wired100_3_2020_bn, broadbandusage_ms, avg_meanthroughputmbps_ml, speedtests_ml, avgwt_downloadspeed_ook, avgwt_uploadspeed_ook, speedtests_ook, numproviders_fcc, avg_fractioncoverage_fcc, avgwt_maxaddown_fcc, avgwt_maxadup_fcc, dummy_score_for_testing FROM masterdataset_speedtestdata_dummyscores',
          vector_extent: 4096,
          bufferSize: 1,
          version: '1.3.1'
        }
      }
    ]
  });
  const url = `https://usignite-intern.carto.com/api/v1/map?apikey=93ca9b2ca98129188e337d41aee1e0faad970acd`;
  const getUrl = `${url}&config=${encodeURIComponent(mapConfig)}`;
  let request;

  if (getUrl.length < REQUEST_GET_MAX_URL_LENGTH) {
    request = new Request(getUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

  } else {
    request = new Request(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: mapConfig
    });
  }

  const response = await fetch(request);
  return (await response.json()).metadata.tilejson.vector.tiles
}

// Create a popup, but don't add it to the map yet. This will be the hover popup
var popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false
});


// Function to query rendered features for the census tract the user is hovering over, highlight that tract, then populate popup with that tract's info
// map.on('mousemove', function(e) {
//   //query for the features under the mouse:
//   var features = map.queryRenderedFeatures(e.point, {
//       layers: ['second_selected_layer'],
//   });
//
//   // Check whether features exist
//   if (features.length > 0) {
//     map.getCanvas().style.cursor = 'pointer'; //change cursor to pointer if hovering over a circle/feature
//
//     var hoveredFeature = features[0];
//     //Extract necessary variables:
//     var tract_id = hoveredFeature.properties.censustract;
//     var tests = hoveredFeature.properties.tests;
//     var upload_sp = hoveredFeature.properties.avgwt_uploadspeed_ook;
//     var download_sp = hoveredFeature.properties.avgwt_downloadspeed_ook
//
//     window['popupContent'] = `
//       <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">Census Tract ${tract_id}</div>
//       <div style = "font-family:sans-serif; font-size:11px; font-weight:600">Download Speed: ${download_sp}</div>
//       <div style = "font-family:sans-serif; font-size:11px; font-weight:600">Upload Speed: ${upload_sp}</div>
//       <div style = "font-family:sans-serif; font-size:10px; font-weight:400">(based on ${tests} tests)</div>
//     `;
//
//     //fix the position of the popup as the position of the circle:
//     popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
//     //create and populate a feature with the properties of the hoveredFeature necessary for data-driven styling of the highlight layer
//     var hoveredFeature_data = {
//       'type': 'Feature',
//       'geometry': hoveredFeature.geometry,
//       'properties': {
//         'avgwt_uploadspeed_ook': upload_sp,
//         'avgwt_downloadspeed_ook': download_sp
//       },
//     };
//     // set this circle's geometry and properties as the data for the highlight source
//     map.getSource('highlight-tract-source').setData(hoveredFeature_data);
//
//     } else { //if len(features) <1
//       // remove the Popup, change back to default cursor and clear data from the highlight data source
//       popup.remove();
//       map.getCanvas().style.cursor = '';
//       map.getSource('highlight-tract-source').setData({
//         'type': 'FeatureCollection',
//         'features': []
//       })
//     }
// });
