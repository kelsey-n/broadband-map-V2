var beforeMap = new mapboxgl.Map({
    container: 'before',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    bounds: [[-80.00125, 40.40703], [-71.64066, 45.08304]]
});

var afterMap = new mapboxgl.Map({
    container: 'after',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    bounds: [[-80.00125, 40.40703], [-71.64066, 45.08304]]
});

// A selector or reference to HTML element
var container = '#comparison-container';

var map = new mapboxgl.Compare(beforeMap, afterMap, container);
map.setSlider(0); // initially position slider off to the side

// Add navigation control:
afterMap.addControl(new mapboxgl.NavigationControl({
  showCompass: false
}));

// enable tooltips
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

// enable button to close modal after user reads disclaimer
document.getElementById('modal-checkbox').addEventListener('change', e => {
  if (e.target.checked) {
    $('#modal-dismiss').removeAttr('disabled');

  } else if (!e.target.checked) {
    $('#modal-dismiss').attr('disabled', 'disabled');
  }
})

// variables to hold and edit our color schemes
var sequential_colors = ['#8A8AFF','#5C5CFF','#2E2EFF','#0000FF','#0000A3']; //blue TRY VARYING SATURATION
var diverging_colors = ['#ca0020','#f4a582','#f7f7f7','#92c5de','#0571b0']; //['#d7191c','#fdae61','#ffffbf','#abd9e9','#2c7bb6'] //['#d7191c','#fdae61','#ffffbf','#a6d96a','#1a9641'] //red --> green TRY CHANGING TO BLUE
var diverging_colors_transparent = ['#ca002080','#f4a58280','#f7f7f780','#92c5de80','#0571b080'];

// 'display column name for frontend of visualization': 'column name in data '
var displayVal_to_colName = {
  'Wired 25 (BN)': 'wired25_3_2020_bn',
  'Wired 100 (BN)': 'wired100_3_2020_bn',
  //'averagembps_bn': 'Average Speed (BN)',
  //'fastestaveragembps_bn': 'Fastest Average Speed (BN)',
  //'lowestpricedterrestrialbroadbandplan_bn': 'Lowest Priced Terrestrial Plan (BN)',
  'Broadband Usage (MS)': 'broadbandusage_ms',
  'M-Lab Throughput': 'avg_meanthroughputmbps_ml',
  'Number of Speed Tests (ML)': 'speedtests_ml',
  'Ookla Download Speed': 'avgwt_downloadspeed_ook',
  'Ookla Upload Speed': 'avgwt_uploadspeed_ook',
  'Number of Speed Tests (Ook)': 'speedtests_ook',
  'Number of Internet Providers (FCC)': 'numproviders_fcc',
  'Average Fraction Coverage (FCC)': 'avg_fractioncoverage_fcc',
  'FCC Download Speed': 'avgwt_maxaddown_fcc',
  'FCC Upload Speed': 'avgwt_maxadup_fcc',
  'Broadband Score': 'dummy_score_for_testing'
};

// create reverse object of displayVal_to_colName
var colName_to_displayVal = {};
for (key in displayVal_to_colName)
    colName_to_displayVal[displayVal_to_colName[key]] = key

// ADD initial_SQL_qry TO INITIAL SQL CALL TO DATABASE- not working, but using for getting values
// define the columns we will need for various steps (mapping, clicking on census tracts)
var sql = new cartodb.SQL({ user: 'usignite-intern' });
var sql_fromStatement = ' FROM masterdataset_speedtestdata_dummyscores'
var colsToMap = [
  'dummy_score_for_testing', 'avgwt_maxaddown_fcc', 'avgwt_maxadup_fcc', 'avgwt_downloadspeed_ook',
  'avgwt_uploadspeed_ook', 'avg_meanthroughputmbps_ml'
];
var initial_SQL_qry = 'SELECT '+colsToMap.join()+sql_fromStatement
var colsForTractClick = [
  'wired25_3_2020_bn', 'wired100_3_2020_bn','avg_meanthroughputmbps_ml',
  'avgwt_downloadspeed_ook','avgwt_uploadspeed_ook',
  'avgwt_maxaddown_fcc', 'avgwt_maxadup_fcc', 'dummy_score_for_testing'
]
var temp_SQL_qry = 'SELECT '+colsForTractClick.join()+sql_fromStatement

// Use these perc values for the variables we want to show on census tract click to style table of clicked census tract.

var tempObj = {};
var percentiles_tractClick = {};
$.each(colsForTractClick, function(i, colName) {
  tempObj[`${colName}`] = []
});

// After map loads, get properties for this temporary object from which we will get percentiles
afterMap.on('load', function() {
  sql.execute(`${temp_SQL_qry}`)
      .done(function(data) {
        var rawdata = data.rows;
        rawdata.forEach((el) => {
          for (const [key, value] of Object.entries(tempObj)) {
            tempObj[`${key}`].push(el[`${key}`])
          };
        });
        for (const [key, value] of Object.entries(tempObj)) {
          percentiles_tractClick[`percs_${key}`] = percentiles(value)
        };
        tempObj = {}; // reset tempObj since we don't need to keep it saved
        console.log(percentiles_tractClick)
      });
});

// Populate the variable selection dropdowns on the frontend:
// $.each(displayVal_to_colName, function(key, value) {
//   $('.dropdown-menu').append(`
//     <li><a class="dropdown-item" data-value=${value} href="#">${key}</a></li>
//     `)
// })

// Obj var to hold arrays of all property values
var featuresObj = {};
$.each(colsToMap, function(i, colName) {
  featuresObj[`${colName}`] = []
});

// After map loads, get properties for drawing charts & calculating percentiles
afterMap.on('load', function() {
  sql.execute(`${initial_SQL_qry}`)
      .done(function(data) {
        var rawdata = data.rows;
        rawdata.forEach((el) => {
          for (const [key, value] of Object.entries(featuresObj)) {
            featuresObj[`${key}`].push(el[`${key}`])
          };
        });
      });
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
};

function getIndexToIns(arr, num) {
  let newarr = arr.concat(num);
  let unique = [...new Set(newarr)];
  if (unique.length != 5) {
    return arr.concat(num).sort((a, b) => a - b).indexOf(num) + 1
  } else {return arr.concat(num).sort((a, b) => a - b).indexOf(num)}
};

// Function to draw histogram of selected variables
function createPlot(arr, percentiles, chartid) {
  // TO DO: check how mapbox stops works for edge vals!!!!
  [0,1,2,3,4].forEach((i) => {
    if (i == 0) {
      window[`x${i}`] = arr.filter(value => value < percentiles[i]);
      var name = `0 - ${percentiles[i]}`;
    } else if (i == 4) {
      window[`x${i}`] = arr.filter(value => value >= percentiles[i-1]);
      var name = `${percentiles[i-1]}+`;
    } else {
      window[`x${i}`] = arr.filter(value => value >= percentiles[i-1] && value < percentiles[i]);
      var name = `${percentiles[i-1]} - ${percentiles[i]}`
    }

    window[`trace${i}`] = { // change this var name to be the range
      x: window[`x${i}`],
      type: 'histogram',
      marker: {
        color: sequential_colors[i]
      },
      name: name
    }
  })

  var data = [trace0, trace1, trace2, trace3, trace4];

  var layout = {
    margin: {
      t: 30, //top margin
      l: 30, //left margin
      r: 0, //right margin
      b: 20 //bottom margin
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    barmode: 'stack',
    legend: {
      font: {
        size: 10
      },
      itemclick: 'toggleothers',
      xanchor: 'center',
      yanchor: 'top',
      x: 0.2,
      y: -0.2,
      orientation: 'v',
      traceorder: 'normal',
      tracegroupgap: 0
    }
  };

  var config = {
    'displayModeBar': false // this is the line that hides the bar.
  };

  Plotly.newPlot(chartid, data, layout, config);
};

// Function to draw table of broadband variables for clicked census tract
function createTable(tractValsObj, percentilesObj, clickedTract) {
  // show census tract & county & final score. Have frontend name for each variable and its value, row colored by value's percentile position compared to all tracts

  // STEPS: for each value in tractValsObj, get index when inserted into its relevant percentilesObj array. actual percentile color should be this index+1.
  // background color of that cell should be index+1'th color in a percentiles color array - use a map here too
  // diverging_colors_transparent
  colorMap = {};
  for (const [key, value] of Object.entries(tractValsObj)) {
    colorMap[key] = getIndexToIns(percentilesObj[`percs_${key}`], value)
  }
  console.log(colorMap)

  var values = [
        Object.keys(tractValsObj).map(x => colName_to_displayVal[x]),
        Object.values(tractValsObj)]

  var data = [{
    type: 'table',
    header: {
      values: [`<b>Tract ${clickedTract}<br>County ________</b>`],
      align: "center",
      line: {width: 1, color: 'white'},
      fill: {color: "white"},
      font: {size: 12, color: "black"}
    },
    cells: {
      values: values,
      align: "left",
      line: {color: "white", width: 1},
      font: {size: 11, color: ["black"]},
      fill: {color: [Object.keys(tractValsObj).map(x => diverging_colors_transparent[colorMap[x]])]}
    }
  }]

  var layout = {
    margin: {
      t: 40, //top margin
      l: 4, //left margin
      r: 0, //right margin
      b: 0 //bottom margin
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  };

  var config = {
    'displayModeBar': false // this is the line that hides the bar.
  };

  Plotly.newPlot('chart1', data, layout, config);
};

// variables to hold the user's selection of variables to display:
var first_var = 'Broadband Score';
var second_var = 'Broadband Score';
var firstarr = [];
var secondarr = [];
checkbox = document.getElementById('checkbox');

// this function will update the variable selections on the first dropdown menu for variable selection:
$("#first-dropdown li a").click(function() {
  map.setSlider(window.innerWidth / 2);

  document.getElementById("chart1").textContent = "";
  document.getElementById("left-controls-title").innerHTML = `<p style = 'text-align: right'>Showing <i class="fas fa-caret-left"></i></p>`;
  document.getElementsByClassName("my-legend")[0].style.visibility = 'hidden';

  first_var = $(this).text();
  first_check = true;
  $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');

  firstarr = featuresObj[`${displayVal_to_colName[first_var]}`];
  // var testpercentiles = percentiles(firstarr) // TO DELETE
  // // create histogram for first variable
  // createPlot(firstarr, testpercentiles)

  // show fill layer for first variable
  beforeMap.setLayoutProperty('scores_layer', 'visibility','none');
  beforeMap.setLayoutProperty('first_selected_layer', 'visibility','visible');

  if ($('#checkbox').prop('checked')) {
    combinedarr = firstarr.concat(secondarr);
    var intervals = percentiles(combinedarr);
    createPlot(firstarr, intervals, 'chart1');
    console.log(intervals);
    beforeMap.setPaintProperty('first_selected_layer', 'fill-color', [
      'step',
      ['get', displayVal_to_colName[first_var]],
      sequential_colors[0],
      intervals[0], sequential_colors[1],
      intervals[1], sequential_colors[2],
      intervals[2], sequential_colors[3],
      intervals[3], sequential_colors[4],
    ]);
    if (secondarr.length > 0) {
      createPlot(secondarr, intervals, 'chart2');
      afterMap.setPaintProperty('second_selected_layer', 'fill-color', [
        'step',
        ['get', displayVal_to_colName[second_var]],
        sequential_colors[0],
        intervals[0], sequential_colors[1],
        intervals[1], sequential_colors[2],
        intervals[2], sequential_colors[3],
        intervals[3], sequential_colors[4],
      ]);
    };
  } else {
    var intervals = percentiles(firstarr);
    createPlot(firstarr, intervals, 'chart1');
    console.log(intervals);
    beforeMap.setPaintProperty('first_selected_layer', 'fill-color', [
      'step',
      ['get', displayVal_to_colName[first_var]],
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
  map.setSlider(window.innerWidth / 2);

  document.getElementById("chart2").textContent = "";
  document.getElementById("right-controls-title").innerHTML = `Showing <i class="fas fa-caret-right"></i>`;
  document.getElementsByClassName("my-legend")[0].style.visibility = 'hidden';

  second_var = $(this).text() //$(this).data('value') - this is a string AND it is updating the global first_var variable BUT still throwing error when we show the layer... `'${$(this).data('value')}'`
  console.log('global first_var:', first_var)
  console.log(jQuery.type(first_var))
  //console.log(`${first_var}`)
  $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');
  // $(this).parents(".dropdown").find('.btn').val($(this).data('value')); // "allows you to have different display text and data value for each element - from SO"

  secondarr = featuresObj[`${displayVal_to_colName[second_var]}`]

  afterMap.setLayoutProperty('scores_layer', 'visibility','none');
  afterMap.setLayoutProperty('second_selected_layer', 'visibility','visible');

  if ($('#checkbox').prop('checked')) {
    combinedarr = secondarr.concat(firstarr);
    var intervals = percentiles(combinedarr);
    createPlot(secondarr, intervals, 'chart2');
    console.log(intervals);
    afterMap.setPaintProperty('second_selected_layer', 'fill-color', [
      'step',
      ['get', displayVal_to_colName[second_var]],
      sequential_colors[0],
      intervals[0], sequential_colors[1],
      intervals[1], sequential_colors[2],
      intervals[2], sequential_colors[3],
      intervals[3], sequential_colors[4],
    ]);
    if (firstarr.length > 0) {
      createPlot(firstarr, intervals, 'chart1');
      beforeMap.setPaintProperty('first_selected_layer', 'fill-color', [
        'step',
        ['get', displayVal_to_colName[first_var]],
        sequential_colors[0],
        intervals[0], sequential_colors[1],
        intervals[1], sequential_colors[2],
        intervals[2], sequential_colors[3],
        intervals[3], sequential_colors[4],
      ]);
    };
  } else {
    var intervals = percentiles(secondarr);
    createPlot(secondarr, intervals, 'chart2');
    console.log(intervals);
    afterMap.setPaintProperty('second_selected_layer', 'fill-color', [
      'step',
      ['get', displayVal_to_colName[second_var]],
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
      createPlot(firstarr, intervals, 'chart1');
      createPlot(secondarr, intervals, 'chart2');
      console.log(intervals)
      beforeMap.setPaintProperty('first_selected_layer', 'fill-color', [
        'step',
        ['get', displayVal_to_colName[first_var]],
        sequential_colors[0],
        intervals[0], sequential_colors[1],
        intervals[1], sequential_colors[2],
        intervals[2], sequential_colors[3],
        intervals[3], sequential_colors[4],
      ]);
      afterMap.setPaintProperty('second_selected_layer', 'fill-color', [
        'step',
        ['get', displayVal_to_colName[second_var]],
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
      createPlot(firstarr, intervals_1, 'chart1');
      createPlot(secondarr, intervals_2, 'chart2');
      console.log(intervals_1)
      console.log(intervals_2)
      beforeMap.setPaintProperty('first_selected_layer', 'fill-color', [
        'step',
        ['get', displayVal_to_colName[first_var]],
        sequential_colors[0],
        intervals_1[0], sequential_colors[1],
        intervals_1[1], sequential_colors[2],
        intervals_1[2], sequential_colors[3],
        intervals_1[3], sequential_colors[4],
      ]);
      afterMap.setPaintProperty('second_selected_layer', 'fill-color', [
        'step',
        ['get', displayVal_to_colName[second_var]],
        sequential_colors[0],
        intervals_2[0], sequential_colors[1],
        intervals_2[1], sequential_colors[2],
        intervals_2[2], sequential_colors[3],
        intervals_2[3], sequential_colors[4],
      ]);
    }
});

// Function to reset map to original state
$("#reset-button").click(function() {
  afterMap.setLayoutProperty('scores_layer', 'visibility','visible');
  afterMap.setLayoutProperty('second_selected_layer', 'visibility','none');
  beforeMap.setLayoutProperty('scores_layer', 'visibility','visible');
  beforeMap.setLayoutProperty('first_selected_layer', 'visibility','none');
  document.getElementsByClassName("my-legend")[0].style.visibility = 'visible';

  map.setSlider(0); // reposition slider to the left side

  // reset instructions text on left map controls
  document.getElementById("left-controls-title").innerHTML = `Instructions`;
  document.getElementById("chart1").innerHTML = `Lorem ipsum dolor sit amet, consectetur adipiscing elit,
    sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
    nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
    reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
    cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

  // reset broadband score description on right map controls
  document.getElementById("right-controls-title").innerHTML = `Broadband Score`;
  document.getElementById("chart2").innerHTML = `Lorem ipsum dolor sit amet, consectetur adipiscing elit,
    sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
    nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
    reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
    cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

  // reset variables
  first_var = 'Broadband Score';
  second_var = 'Broadband Score';
  firstarr = [];
  secondarr = [];

  // reset button text
  document.getElementById('left-button').innerHTML = 'Select ISP-reported speed <span class="caret"></span>'
  document.getElementById('right-button').innerHTML = 'Select measured speed <span class="caret"></span>'

});




beforeMap.on('style.load', function() {
  $('#exampleModalCenter').modal('show') // show modal when style loads
});

// Function to add styling for hovered census tract
beforeMap.on('load', function() {

  // openNav(); //load welcome message on load

  // add an empty data source, which we will use to highlight the census tract that the user is hovering over
  beforeMap.addSource('highlight-tract-source-beforeMap', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  // add a layer for the hovered census tract
  beforeMap.addLayer({
    id: 'highlight-tract-layer-beforeMap',
    type: 'line',
    source: 'highlight-tract-source-beforeMap',
    paint: {
      'line-width': 5,
      'line-color': 'black',
      // 'fill-opacity': 1,
      // 'fill-outline-color': 'black'
    }
  });
  beforeMap.moveLayer('highlight-tract-layer-beforeMap', 'scores_layer')
})

// Function to add styling for hovered census tract
afterMap.on('load', function() {

  // openNav(); //load welcome message on load

  // add an empty data source, which we will use to highlight the census tract that the user is hovering over
  afterMap.addSource('highlight-tract-source-afterMap', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  // add a layer for the hovered census tract
  afterMap.addLayer({
    id: 'highlight-tract-layer-afterMap',
    type: 'line',
    source: 'highlight-tract-source-afterMap',
    paint: {
      'line-width': 2,
      'line-color': 'black',
    }
  });

  // plot scores on right map controls:
  // var initial_intervals = percentiles(featuresObj['dummy_score_for_testing']);
  // createInitialPlot(featuresObj['dummy_score_for_testing'], initial_intervals);
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
        'fill-opacity': 1
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
        'fill-opacity': 1
        // 'fill-outline-color': 'black'
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
          ['get', displayVal_to_colName[first_var]],
          sequential_colors[0],
          25, sequential_colors[1],
          100, sequential_colors[2],
          200, sequential_colors[3],
          230, sequential_colors[4],
        ],
        'fill-opacity': 1
        // 'fill-outline-color': 'black'
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
        'fill-opacity': 1
        // 'fill-outline-color': 'black'
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
          sql: 'SELECT the_geom_webmercator, censustract, dummy_score_for_testing, avgwt_maxaddown_fcc, avgwt_maxadup_fcc, avgwt_downloadspeed_ook, avgwt_uploadspeed_ook, avg_meanthroughputmbps_ml FROM masterdataset_speedtestdata_dummyscores',
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






beforeMap.on('load', function() {

  // Function to query rendered features for the census tract the user is hovering over, highlight that tract, then populate popup with that tract's info
  beforeMap.on('mousemove', function(e) {
    //query for the features under the mouse:
    var features = beforeMap.queryRenderedFeatures(e.point, {
        layers: ['scores_layer', 'first_selected_layer']
      });

    // Check whether features exist
    if (features.length > 0) {
      beforeMap.getCanvas().style.cursor = 'pointer'; //change cursor to pointer if hovering over a census tract

      var hoveredFeature = features[0];
      //Extract necessary variables:
      var tract_id = hoveredFeature.properties.censustract;
      // var county_name = INCLUDE COUNTY NAME HERE
      var first_var_value = hoveredFeature.properties[`${displayVal_to_colName[first_var]}`];
      var second_var_value = hoveredFeature.properties[`${displayVal_to_colName[second_var]}`];

      if (first_var === second_var) {
        window['popupContent'] = `
          <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">Census Tract ${tract_id}</div>
          <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">County</div>
          <div style = "font-family:sans-serif; font-size:11px; font-weight:600">${first_var}: ${first_var_value}</div>
        `;
      } else {
        window['popupContent'] = `
          <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">Census Tract ${tract_id}</div>
          <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">County</div>
          <div style = "font-family:sans-serif; font-size:11px; font-weight:600">${first_var}: ${first_var_value}</div>
          <div style = "font-family:sans-serif; font-size:11px; font-weight:600">${second_var}: ${second_var_value}</div>
        `;
      };

      //fix the position of the popup as the position of the circle:
      popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(beforeMap);
      //create and populate a feature with the properties of the hoveredFeature necessary for data-driven styling of the highlight layer
      // var hoveredFeature_data = {
      //   'type': 'Feature',
      //   'geometry': hoveredFeature.geometry,
      //   'properties': {
      //     'avgwt_uploadspeed_ook': upload_sp,
      //     'avgwt_downloadspeed_ook': download_sp
      //   },
      // };
      // set this circle's geometry and properties as the data for the highlight source
      beforeMap.getSource('highlight-tract-source-beforeMap').setData(hoveredFeature.geometry);

      } else { //if len(features) <1
        // remove the Popup, change back to default cursor and clear data from the highlight data source
        popup.remove();
        beforeMap.getCanvas().style.cursor = '';
        beforeMap.getSource('highlight-tract-source-beforeMap').setData({
          'type': 'FeatureCollection',
          'features': []
        })
      }
  });
});

afterMap.on('load', function() {

  // Function to query rendered features for the census tract the user is hovering over, highlight that tract, then populate popup with that tract's info
  afterMap.on('mousemove', function(e) {
    //query for the features under the mouse:
    var features = afterMap.queryRenderedFeatures(e.point, {
        layers: ['scores_layer', 'second_selected_layer']
      });

    // Check whether features exist
    if (features.length > 0) {
      afterMap.getCanvas().style.cursor = 'pointer'; //change cursor to pointer if hovering over a census tract

      var hoveredFeature = features[0];
      //Extract necessary variables:
      var tract_id = hoveredFeature.properties.censustract;
      // var county_name = INCLUDE COUNTY NAME HERE
      var first_var_value = hoveredFeature.properties[`${displayVal_to_colName[first_var]}`];
      var second_var_value = hoveredFeature.properties[`${displayVal_to_colName[second_var]}`];

      if (first_var === second_var) {
        window['popupContent'] = `
          <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">Census Tract ${tract_id}</div>
          <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">County</div>
          <div style = "font-family:sans-serif; font-size:11px; font-weight:600">${first_var}: ${first_var_value}</div>
        `;
      } else {
        window['popupContent'] = `
          <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">Census Tract ${tract_id}</div>
          <div style = "font-family:sans-serif; font-size:14px; font-weight:bold">County</div>
          <div style = "font-family:sans-serif; font-size:11px; font-weight:600">${first_var}: ${first_var_value}</div>
          <div style = "font-family:sans-serif; font-size:11px; font-weight:600">${second_var}: ${second_var_value}</div>
        `;
      };

      //fix the position of the popup as the position of the circle:
      popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(afterMap);
      //create and populate a feature with the properties of the hoveredFeature necessary for data-driven styling of the highlight layer
      // var hoveredFeature_data = {
      //   'type': 'Feature',
      //   'geometry': hoveredFeature.geometry,
      //   'properties': {
      //     'avgwt_uploadspeed_ook': upload_sp,
      //     'avgwt_downloadspeed_ook': download_sp
      //   },
      // };
      // set this circle's geometry and properties as the data for the highlight source
      afterMap.getSource('highlight-tract-source-afterMap').setData(hoveredFeature.geometry);

      } else { //if len(features) <1
        // remove the Popup, change back to default cursor and clear data from the highlight data source
        popup.remove();
        afterMap.getCanvas().style.cursor = '';
        afterMap.getSource('highlight-tract-source-afterMap').setData({
          'type': 'FeatureCollection',
          'features': []
        })
      }
  });

  afterMap.on('click', 'scores_layer', function(e) {

    //document.getElementById("chart1").innerHTML = `<p style="text-align: center; padding: 0; margin: 0">Broadband Data</p>`;
    //document.getElementById("chart1").innerHTML = `Broadband Data`;
    document.getElementById("chart1").textContent = "";
    document.getElementById("chart2").textContent = "";
    document.getElementById("left-controls-title").textContent = "Broadband Data";
    document.getElementById("right-controls-title").textContent = "Demographic Data";
    // document.getElementById("broadband-legend").style.visibility = 'visible';

    // get the clicked tract number by querying the rendered features
    var features = afterMap.queryRenderedFeatures(e.point, {
        layers: ['scores_layer'],
    });
    var clickedFeature = features[0]
    var clickedTract = clickedFeature.properties.censustract

    // sql query to get data for clicked tract
    var tractClick_SQL_qry = 'SELECT '+colsForTractClick.join()+sql_fromStatement+' WHERE censustract = '+clickedTract
    sql.execute(`${tractClick_SQL_qry}`)
       .done(function(data) {
        window['tractValues'] = data.rows[0];
        console.log(tractValues);
        // create table with plotly HERE using tractValues and percentilesObject as input
        createTable(tractValues, percentiles_tractClick, clickedTract);
      });

  })
})
