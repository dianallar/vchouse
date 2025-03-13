document.addEventListener('DOMContentLoaded', () => {
  // Initialize the map
  const map = L.map('map').setView([37.8, -96], 4);
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Store references to DOM elements
  const detailsPanel = document.getElementById('districtDetails');
  const searchInput = document.getElementById('districtSearch');
  const searchResults = document.getElementById('searchResults');

  // Example data for Senators
  const senators = {
    'Olympia': [
      {
        name: 'Adam Salinger (D)',
        termExpiration: 'May 2025',
        portrait: 'salinger.png',
        state: 'New York',
        class: 'Class 3'
      },
      {
        name: 'George Wilson (D)',
        termExpiration: 'March 2025',
        portrait: 'wilson.png',
        state: 'New York',
        class: 'Class 1'
      }
    ],
    'Lincoln': [
      {
        name: 'Joseph McCarthy (R)',
        termExpiration: 'April 2025',
        portrait: 'mccarthy.png',
        state: 'Wisconsin',
        class: 'Class 2'
      },
      {
        name: 'Threes Twos (D)',
        termExpiration: 'May 2025',
        portrait: 'twos.png',
        state: 'Illinois',
        class: 'Class 3'
      }
    ],
    'Jackson': [
        {
          name: 'Noah Constrictor (R)',
          termExpiration: 'May 2025',
          portrait: 'constrictor.png',
          state: 'Arkansas',
          class: 'Class 3'
        },
        {
          name: 'Axel Hersey (R)',
          termExpiration: 'April 2025',
          portrait: 'hersey.png',
          state: 'Florida',
          class: 'Class 2'
        }
      ],
      'Frontier': [
          {
            name: 'Aislinn Kinsley (R)',
            termExpiration: 'May 2025',
            portrait: 'kinsley.png',
            state: 'Montana',
            class: 'Class 3'
          },
          {
            name: 'John Zimmermann (D)',
            termExpiration: 'March 2025',
            portrait: 'zimmermann.png',
            state: 'Wyoming',
            class: 'Class 1'
          }
        ],
        'Pacifica': [
          {
            name: 'Neel McGavin (R)',
            termExpiration: 'March 2025',
            portrait: 'mcgavin.png',
            state: 'Arizona',
            class: 'Class 1'
          },
          {
            name: 'Kayla Whitmer (R)',
            termExpiration: 'April 2025',
            portrait: 'whitmer.png',
            state: 'Hawaii',
            class: 'Class 2'
          }
        ]
    // Add more superstates and their senators as needed
  };

  // Function to get color based on party majority in superstate
  function getColor(superstate) {
    const senatorList = senators[superstate] || [];
    let demCount = 0;
    let repCount = 0;
    
    senatorList.forEach(senator => {
      if (senator.name.includes('(D)')) demCount++;
      if (senator.name.includes('(R)')) repCount++;
    });

    if (demCount > repCount) return '#78b6f0';
    if (repCount > demCount) return '#ff3d3d';
    return '#808080';
  }

  // Function to show Senator details in the sidebar
  function showSenatorDetails(superstate, index = 0) {
    const senatorList = senators[superstate];
    if (!senatorList || senatorList.length === 0) return;

    const senator = senatorList[index];
    const party = senator.name.includes('(D)') ? 'D' : senator.name.includes('(R)') ? 'R' : senator.name.includes('(I)') ? 'I' : 'Unknown';
    const repColor = party === 'D' ? '#0000FF' : party === 'R' ? '#FF0000' : party === 'I' ? '#800080' : '#000000';

    detailsPanel.innerHTML = `
      <button class="close-btn">&times;</button>
      <img src="portraits/${senator.portrait}" alt="${senator.name}" class="popup-portrait">
      <div class="rep-name" style="color: ${repColor};">${senator.name}</div>
      <div class="district-key">${superstate}</div>
      <hr>
      <div>
        <strong>Term Expiration:</strong> ${senator.termExpiration}<br>
        <strong>State of Residence:</strong> ${senator.state}<br>
        <strong>Senate Class:</strong> ${senator.class}
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <button id="prevSenator" ${index === 0 ? 'disabled' : ''}>&lt; Prev</button>
        <span>${index + 1} / ${senatorList.length}</span>
        <button id="nextSenator" ${index === senatorList.length - 1 ? 'disabled' : ''}>Next &gt;</button>
      </div>
    `;
    detailsPanel.style.display = 'block';
    detailsPanel.style.right = '0';
    detailsPanel.style.left = 'auto';

    // Add event listener for the close button
    document.querySelector('#districtDetails .close-btn').addEventListener('click', () => {
      detailsPanel.style.display = 'none';
    });

    // Add event listeners for navigation buttons
    document.getElementById('prevSenator').addEventListener('click', () => {
      showSenatorDetails(superstate, index - 1);
    });
    document.getElementById('nextSenator').addEventListener('click', () => {
      showSenatorDetails(superstate, index + 1);
    });
  }

  // Fetch and add the GeoJSON layer
  fetch('VCStates.json')
    .then(response => response.text()) // Change to text() first
    .then(text => {
      try {
        const data = JSON.parse(text); // Manually parse JSON
        
        // Create the GeoJSON layer
        const geojsonLayer = L.geoJSON(data, {
          style: feature => ({
            fillColor: getColor(feature.properties.name), // Changed to 'name' property
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
          }),
          onEachFeature: (feature, layer) => {
            const superstate = feature.properties.name; // Changed to 'name' property
            
            // Add popup with state info
            layer.bindPopup(`
              <div class="popup-content">
                <strong>${superstate}</strong><br>
                ${senators[superstate] ? senators[superstate].map(s => s.name).join('<br>') : 'No senators'}
              </div>
            `);

            // Add click handler
            layer.on('click', () => {
              if (senators[superstate]) {
                showSenatorDetails(superstate);
              }
            });

            // Add hover effects
            layer.on('mouseover', () => {
              layer.setStyle({
                weight: 2,
                fillOpacity: 0.9
              });
            });

            layer.on('mouseout', () => {
              layer.setStyle({
                weight: 1,
                fillOpacity: 0.7
              });
            });
          }
        }).addTo(map);

        // Fit map to GeoJSON bounds
        map.fitBounds(geojsonLayer.getBounds());
      } catch (e) {
        console.error('Error parsing GeoJSON:', e);
      }
    })
    .catch(err => console.error('Error loading GeoJSON:', err));

  // Update the search functionality
  searchInput.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    const results = Object.keys(senators).filter(superstate => 
      superstate.toLowerCase().includes(term) ||
      senators[superstate].some(senator => 
        senator.name.toLowerCase().includes(term) ||
        senator.state.toLowerCase().includes(term)
      )
    );
    updateSearchResults(results);
  });

  // Function to update the search results list
  function updateSearchResults(results) {
    searchResults.innerHTML = '';
    results.forEach(superstate => {
      const senatorList = senators[superstate];
      senatorList.forEach((senator, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result';
        resultItem.style.padding = '10px';
        resultItem.style.cursor = 'pointer';
        resultItem.style.borderBottom = '1px solid #eee';
        resultItem.textContent = `${superstate}: ${senator.name}`;
        resultItem.addEventListener('click', () => {
          showSenatorDetails(superstate, index);
        });

        searchResults.appendChild(resultItem);
      });
    });
    searchResults.style.display = results.length ? 'block' : 'none';
  }

  // Update counts in the UI
  function updateSenateCounts() {
    let totalDem = 0;
    let totalRep = 0;

    Object.values(senators).forEach(senatorList => {
      senatorList.forEach(senator => {
        if (senator.name.includes('(D)')) totalDem++;
        if (senator.name.includes('(R)')) totalRep++;
      });
    });

    document.getElementById('demCount').textContent = totalDem;
    document.getElementById('repCount').textContent = 
      `${totalRep} ${totalRep > totalDem ? '(Republican Majority)' : ''}`;
  }

  // Call updateSenateCounts when the page loads
  updateSenateCounts();
});