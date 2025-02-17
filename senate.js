document.addEventListener('DOMContentLoaded', () => {
  const senateMap = document.getElementById('senateMap');
  const detailsPanel = document.getElementById('districtDetails');
  const searchInput = document.getElementById('districtSearch');
  const searchResults = document.getElementById('searchResults');
  const closeBtn = document.querySelector('#districtDetails .close-btn');

  // Example data for Senators
  const senators = {
    'superstate1': {
      name: 'Senator A',
      termExpiration: '2026',
      portrait: 'senatorA.jpg',
      state: 'State A',
      class: 'Class 1'
    },
    'superstate2': {
      name: 'Senator B',
      termExpiration: '2028',
      portrait: 'senatorB.jpg',
      state: 'State B',
      class: 'Class 2'
    }
    // Add more senators as needed
  };

  // Function to show Senator details in the sidebar
  function showSenatorDetails(superstate) {
    const senator = senators[superstate];
    if (!senator) return;

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
    `;
    detailsPanel.style.display = 'block';
    detailsPanel.style.right = '0';
    detailsPanel.style.left = 'auto';

    // Add event listener for the close button
    document.querySelector('#districtDetails .close-btn').addEventListener('click', () => {
      detailsPanel.style.display = 'none';
    });
  }

  // Add event listeners to the SVG elements
  senateMap.addEventListener('load', () => {
    const svgDoc = senateMap.contentDocument;
    const states = svgDoc.querySelectorAll('.state');

    states.forEach(state => {
      state.addEventListener('click', () => {
        const superstate = state.id; // Assuming each state has an ID corresponding to the superstate
        showSenatorDetails(superstate);
      });
    });
  });

  // Search functionality: filter features based on user input
  searchInput.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    const results = Object.keys(senators).filter(superstate => superstate.toLowerCase().includes(term));
    updateSearchResults(results);
  });

  // Function to update the search results list
  function updateSearchResults(results) {
    searchResults.innerHTML = '';
    results.forEach(superstate => {
      const senator = senators[superstate];
      const resultItem = document.createElement('div');
      resultItem.className = 'search-result';
      resultItem.style.padding = '10px';
      resultItem.style.cursor = 'pointer';
      resultItem.style.borderBottom = '1px solid #eee';
      resultItem.textContent = `${superstate}: ${senator.name}`;
      resultItem.addEventListener('click', () => {
        showSenatorDetails(superstate);
      });

      searchResults.appendChild(resultItem);
    });
    searchResults.style.display = results.length ? 'block' : 'none';
  }
});