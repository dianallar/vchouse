document.addEventListener('DOMContentLoaded', () => {
  // Create the map
  const map = L.map('map').setView([37.8, -96], 4);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; OpenStreetMap contributors'
  })
  .addTo(map);

  // Global variables within this closure
  let allDistricts = []; // Array to store each feature and its layer
  const searchInput = document.getElementById('districtSearch');
  const searchResults = document.getElementById('searchResults');
  const detailsPanel = document.getElementById('districtDetails');
  const closeBtn = document.querySelector('#districtDetails .close-btn');
  let repMap = {}; // Will hold the representatives mapping

  // Fetch the representatives data
  fetch('path/to/representatives.json')
    .then(response => response.json())
    .then(representatives => {
      // Populate the repMap with the representatives data
      representatives.forEach(rep => {
        const compositeKey = `${rep.state}-${rep.district}`;
        repMap[compositeKey] = rep.name;
      });

      // Fetch the GeoJSON data
      return fetch('https://storage.googleapis.com/vchousemapgeojson/districts_with_states.geojson');
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
            showDistrictDetails(feature);
            map.fitBounds(layer.getBounds());
          });
        }
      });

      // Add the GeoJSON layer to the map
      geojsonLayer.addTo(map);
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
      representative.includes('(D)') ? 'D' : representative.includes('(R)') ? 'R' : 'Unknown';
    const repColor = party === 'D' ? '#0000FF' : party === 'R' ? '#FF0000' : '#000000';
    const repName = representative.replace(/\([DR]\)/, '').trim();

    detailsPanel.innerHTML = `
      <button class="close-btn">&times;</button>
      <img src="portraits/${compositeKey}.jpg" alt="${repName}">
      <div>
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
    `;
    detailsPanel.style.display = 'block';
    detailsPanel.style.right = '0';
    detailsPanel.style.left = 'auto';

    // Add event listener for the close button
    document.querySelector('#districtDetails .close-btn').addEventListener('click', () => {
      detailsPanel.style.display = 'none';
    });
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
        map.fitBounds(d.layer.getBounds());
        showDistrictDetails(d.feature);
      });

      searchResults.appendChild(resultItem);
    });
    searchResults.style.display = results.length ? 'block' : 'none';
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