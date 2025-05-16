document.addEventListener('DOMContentLoaded', () => {
  // Create the main map
  const map = L.map('map').setView([37.8, -96], 4);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; OpenStreetMap contributors'
  }).addTo(map);

  // Create the mini-map
  const miniMap = L.map('miniMap', {
    attributionControl: false,
    zoomControl: false
  }).setView([37.8, -96], 4);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; OpenStreetMap contributors'
  }).addTo(miniMap);

  // Global variables within this closure
  let allDistricts = []; // Array to store each feature and its layer
  let visibleDistricts = []; // Array to store visible districts
  const searchInput = document.getElementById('districtSearch');
  const searchResults = document.getElementById('searchResults');
  const detailsPanel = document.getElementById('districtDetails');
  const closeBtn = document.querySelector('#districtDetails .close-btn');
  let repMap = {}; // Will hold the representatives mapping
  let demCount = 0;
  let repCount = 0;
  let claimedCount = 0;

  // Fetch the representatives data
  fetch('representatives.json')
    .then(response => response.json())
    .then(representatives => {
      console.log('Representatives data:', representatives); // Debugging log

      // Check if representatives is an object
      if (typeof representatives !== 'object' || representatives === null) {
        throw new Error('Representatives data is not an object');
      }

      // Populate the repMap with the representatives data
      Object.keys(representatives).forEach(key => {
        repMap[key] = representatives[key];
        if (representatives[key] !== 'N/A') {
          claimedCount++;
        }
      });

      // Fetch the GeoJSON data
      return fetch('vchouse/districts_with_states.geojson');
    })
    .then(response => response.json())
    .then(data => {
      // Use the GeoJSON data
      console.log(data);

      // Create the GeoJSON layer with style and feature callbacks
      const geojsonLayer = L.geoJSON(data, {
        style: feature => {
          const lean = classifyPartisanLean(feature.properties);
          return {
            color: 'black',
            weight: 1,
            fillColor: getColor(lean),
            fillOpacity: 0.7
          };
        },
        onEachFeature: (feature, layer) => {
          // Save the feature/layer pair for search functionality
          allDistricts.push({ feature, layer });

          // Extract properties from the feature
          const state = feature.properties.State || feature.properties.state || 'Unknown';
          const districtId =
            feature.properties.District ||
            feature.properties.district ||
            feature.properties.id ||
            'Unknown';
          const compositeKey = `${state}-${districtId}`;
          const representative = repMap[compositeKey] || 'Unknown';
          const party =
            representative.includes('(D)')
              ? 'D'
              : representative.includes('(R)')
              ? 'R'
              : 'Unknown';
          const repColor = party === 'D' ? '#0000FF' : party === 'R' ? '#FF0000' : '#000000';
          const repName = representative.replace(/\([DR]\)/, '').trim();

          // Get additional data from the feature
          const lean = classifyPartisanLean(feature.properties);
          const repVotes = feature.properties.G20PreR || feature.properties.repVotes || 'N/A';
          const demVotes = feature.properties.G20PreD || feature.properties.demVotes || 'N/A';
          const totalIncome = feature.properties.DTotal_Income || feature.properties.totalIncome || 'N/A';
          const whitePop = feature.properties.DWhite || feature.properties.whitePop || 'N/A';
          const blackPop = feature.properties.DBlack || feature.properties.blackPop || 'N/A';
          const nativePop = feature.properties.DNative || feature.properties.nativePop || 'N/A';
          const asianPop = feature.properties.DAsian || feature.properties.asianPop || 'N/A';
          const pacificPop = feature.properties.DPacific || feature.properties.pacificPop || 'N/A';
          const latinoPop = feature.properties.DLatino || feature.properties.latinoPop || 'N/A';
          const multiracialPop =
            feature.properties.DMultiracial || feature.properties.multiracialPop || 'N/A';
          const giniIndex = feature.properties.DGINI || feature.properties.giniIndex || 'N/A';

          // Build the popup content string
          const popupContent = `
            <div style="display: flex; align-items: center;">
              <div style="flex: 1;">
                <strong>State:</strong> ${state}<br>
                <strong>District ID:</strong> ${districtId}<br>
                <strong>Representative:</strong> 
                <span style="color: ${repColor}; font-weight: bold;">${representative}</span><br>
                <strong>Partisan Lean:</strong> ${lean}<br>
                <strong>2020 Presidential Votes (R):</strong> ${repVotes}<br>
                <strong>2020 Presidential Votes (D):</strong> ${demVotes}<br>
                <strong>Total Income:</strong> ${totalIncome}<br>
                <strong>White Population:</strong> ${whitePop}<br>
                <strong>Black Population:</strong> ${blackPop}<br>
                <strong>Native Population:</strong> ${nativePop}<br>
                <strong>Asian Population:</strong> ${asianPop}<br>
                <strong>Pacific Islander Population:</strong> ${pacificPop}<br>
                <strong>Latino Population:</strong> ${latinoPop}<br>
                <strong>Multiracial Population:</strong> ${multiracialPop}<br>
                <strong>GINI Index:</strong> ${giniIndex}
              </div>
              <div style="margin-left: 20px; text-align: center;">
                <img src="portraits/${compositeKey}.jpg" alt="${repName}" style="width: 100px; height: auto; border-radius: 5px;">
                <div style="margin-top: 5px; font-size: 12px;">${repName}</div>
              </div>
            </div>
          `;

          // Bind the popup to the layer and add a click handler for the side panel
          layer.bindPopup(popupContent);
          layer.on('click', () => {
            map.fitBounds(layer.getBounds());
          });

          // Count partisan lean
          if (lean.includes('D')) {
            demCount++;
          } else if (lean.includes('R')) {
            repCount++;
          }
        }
      });

      // Add the GeoJSON layer to the map
      geojsonLayer.addTo(map);
      visibleDistricts = allDistricts;

      // Add event listener for toggle button
      const toggleButton = document.getElementById('toggleButton');
      toggleButton.addEventListener('click', () => {
        const showInhabited = toggleButton.textContent.includes('Show Inhabited');
        
        allDistricts.forEach(d => {
          const state = d.feature.properties.State || d.feature.properties.state;
          const district = d.feature.properties.District || d.feature.properties.district;
          const compositeKey = `${state}-${district}`;
          
          if (showInhabited) {
            // When showing inhabited only
            if (repMap[compositeKey] === 'N/A' || repMap[compositeKey] === 'Unknown') {
              map.removeLayer(d.layer);
            } else {
              map.addLayer(d.layer); // Make sure inhabited districts are visible
            }
          } else {
            // When showing all districts
            map.addLayer(d.layer);
          }
        });
        
        // Update button text
        toggleButton.textContent = showInhabited ? 'Show All Districts' : 'Show Inhabited Districts Only';
      });

      // Update district data counts
      document.getElementById('demCount').textContent = demCount;
      document.getElementById('repCount').textContent = repCount;
      document.getElementById('claimedCount').textContent = claimedCount;
    })
    .catch(err => console.error(err));

  // Search functionality: filter features based on user input
  searchInput.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    const results = allDistricts.filter(d => {
      const props = d.feature.properties;
      const state = props.State || props.state || 'Unknown';
      const districtId = props.District || props.district || props.id || 'Unknown';
      const compositeKey = `${state}-${districtId}`.toLowerCase();
      return compositeKey.includes(term);
    });
    updateSearchResults(results);
  });

  // Function to display district details in the side panel
  function showDistrictDetails(feature) {
    const props = feature.properties;
    const state = props.State || props.state || 'Unknown';
    const districtId = props.District || props.district || props.id || 'Unknown';
    const compositeKey = `${state}-${districtId}`;
    const representative = repMap[compositeKey] || 'Unknown';
    const lean = classifyPartisanLean(props);
    const repVotes = props.G20PreR || props.repVotes || 'N/A';
    const demVotes = props.G20PreD || props.demVotes || 'N/A';
    const totalIncome = props.DTotal_Income || props.totalIncome || 'N/A';
    const whitePop = props.DWhite || props.whitePop || 'N/A';
    const blackPop = props.DBlack || props.blackPop || 'N/A';
    const nativePop = props.DNative || props.nativePop || 'N/A';
    const asianPop = props.DAsian || props.asianPop || 'N/A';
    const pacificPop = props.DPacific || props.pacificPop || 'N/A';
    const latinoPop = props.DLatino || props.latinoPop || 'N/A';
    const multiracialPop = props.DMultiracial || props.multiracialPop || 'N/A';
    const giniIndex = props.DGINI || props.giniIndex || 'N/A';

    const party =
      representative.includes('(D)') ? 'D' : representative.includes('(R)') ? 'R' : representative.includes('(I)') ? 'I' : 'Unknown';
    const repColor = party === 'D' ? '#0000FF' : party === 'R' ? '#FF0000' : party === 'I' ? '#800080' : '#000000';
    const repName = representative.replace(/\([DRI]\)/, '').trim();

    detailsPanel.innerHTML = `
      <button class="close-btn">&times;</button>
      <img src="portraits/${compositeKey}.jpg" alt="${repName}" class="popup-portrait">
      <div class="rep-name" style="color: ${repColor};">${repName}</div>
      <div class="district-key">${compositeKey}</div>
      <hr>
      <div>
        <strong>Partisan Lean:</strong> ${lean}<br>
        <strong>2020 Presidential Votes (R):</strong> ${repVotes}<br>
        <strong>2020 Presidential Votes (D):</strong> ${demVotes}<br>
        <strong>Total Income:</strong> ${totalIncome}<br>
        <strong>White Population:</strong> ${whitePop}<br>
        <strong>Black Population:</strong> ${blackPop}<br>
        <strong>Native Population:</strong> ${nativePop}<br>
        <strong>Asian Population:</strong> ${asianPop}<br>
        <strong>Pacific Islander Population:</strong> ${pacificPop}<br>
        <strong>Latino Population:</strong> ${latinoPop}<br>
        <strong>Multiracial Population:</strong> ${multiracialPop}<br>
        <strong>GINI Index:</strong> ${giniIndex}
      </div>
      <div id="miniMap" style="height: 200px; margin-top: 20px;"></div>
    `;
    detailsPanel.style.display = 'block';
    detailsPanel.style.right = '0';
    detailsPanel.style.left = 'auto';

    // Add event listener for the close button
    document.querySelector('#districtDetails .close-btn').addEventListener('click', () => {
      detailsPanel.style.display = 'none';
    });

    // Update the mini-map to show the selected district's boundaries
    miniMap.eachLayer(layer => {
      miniMap.removeLayer(layer);
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: 'Map data &copy; OpenStreetMap contributors'
    }).addTo(miniMap);
    const districtLayer = L.geoJSON(feature);
    districtLayer.addTo(miniMap);
    miniMap.fitBounds(districtLayer.getBounds());
  }

  // Function to update the search results list
  function updateSearchResults(results) {
    searchResults.innerHTML = '';
    results.forEach(d => {
      const props = d.feature.properties;
      const state = props.State || props.state || 'Unknown';
      const districtId = props.District || props.district || props.id || 'Unknown';
      const compositeKey = `${state}-${districtId}`;
      const representative = repMap[compositeKey] || 'Unknown';

      const resultItem = document.createElement('div');
      resultItem.className = 'search-result';
      resultItem.style.padding = '10px';
      resultItem.style.cursor = 'pointer';
      resultItem.style.borderBottom = '1px solid #eee';
      resultItem.textContent = `${state}-${districtId}: ${representative}`;
      resultItem.addEventListener('click', () => {
        showDistrictDetails(d.feature);
        map.fitBounds(d.layer.getBounds()); // Zoom in on the district
      });

      searchResults.appendChild(resultItem);
    });
    searchResults.style.display = results.length ? 'block' : 'none';
  }

  // Function to toggle visibility of inhabited districts
  function toggleInhabitedDistricts() {
    const button = document.getElementById('toggleButton');
    const showInhabited = button.textContent.includes('Show Inhabited');
    
    // Store current map state to avoid unnecessary operations
    const currentlyDisplayed = new Set();
    map.eachLayer(layer => {
      if (layer.feature) {
        currentlyDisplayed.add(layer);
      }
    });

    allDistricts.forEach(d => {
      const state = d.feature.properties.State || d.feature.properties.state;
      const district = d.feature.properties.District || d.feature.properties.district;
      const compositeKey = `${state}-${district}`;
      
      if (showInhabited) {
        // When showing inhabited only
        if (repMap[compositeKey] === 'N/A' || repMap[compositeKey] === 'Unknown') {
          if (currentlyDisplayed.has(d.layer)) {
            map.removeLayer(d.layer);
          }
        }
      } else {
        // When showing all districts
        if (!currentlyDisplayed.has(d.layer)) {
          map.addLayer(d.layer);
        }
      }
    });
    
    // Update button text
    button.textContent = showInhabited ? 'Show All Districts' : 'Show Inhabited Districts Only';
  }

  // Example helper functions

  function classifyPartisanLean(props) {
    let rep, dem;
    if (typeof props.RepPct !== 'undefined' || typeof props.DemPct !== 'undefined') {
      rep = props.RepPct ?? 0;
      dem = props.DemPct ?? 0;
      if (rep > 0 && rep <= 1) rep *= 100;
      if (dem > 0 && dem <= 1) dem *= 100;
    } else {
      rep = props.G20PreR ?? props.repVotes ?? 0;
      dem = props.G20PreD ?? props.demVotes ?? 0;
      const total = rep + dem;
      if (total === 0) return 'No Data';
      rep = (rep / total) * 100;
      dem = (dem / total) * 100;
    }

    if (rep > dem) {
      if (rep > 60) return 'Safe R';
      if (rep > 50) return 'Likely R';
      if (rep > 40) return 'Lean R';
      return 'Tilt R';
    } else {
      if (dem > 60) return 'Safe D';
      if (dem > 50) return 'Likely D';
      if (dem > 40) return 'Lean D';
      return 'Tilt D';
    }
  }

  function getColor(lean) {
    switch (lean) {
      case 'Safe R':   return '#FF0000';
      case 'Likely R': return '#FF6666';
      case 'Lean R':   return '#FF9999';
      case 'Tilt R':   return '#FFCCCC';
      case 'Tilt D':   return '#CCCCFF';
      case 'Lean D':   return '#9999FF';
      case 'Likely D': return '#6666FF';
      case 'Safe D':   return '#0000FF';
      default:         return '#D3D3D3';
    }
  }
});
