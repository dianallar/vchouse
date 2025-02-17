document.addEventListener('DOMContentLoaded', () => {
  const senateMap = document.getElementById('senateMap');
  const detailsPanel = document.getElementById('districtDetails');
  const searchInput = document.getElementById('districtSearch');
  const searchResults = document.getElementById('searchResults');
  const closeBtn = document.querySelector('#districtDetails .close-btn');

  // Example data for Senators
  const senators = {
    'Olympia': [
      {
        name: 'Adam Salinger (D)',
        termExpiration: 'May 2025',
        portrait: 'Senate186\salinger.png',
        state: 'New York',
        class: 'Class 3'
      },
      {
        name: 'Quantum K. Kearsley (D)',
        termExpiration: 'March 2025',
        portrait: 'Senate186\kearsley.png',
        state: 'New York',
        class: 'Class 1'
      }
    ],
    'Lincoln': [
      {
        name: 'Joseph McCarthy (R)',
        termExpiration: 'April 2025',
        portrait: 'Senate186\mccarthy.png',
        state: 'Wisconsin',
        class: 'Class 2'
      },
      {
        name: 'Threes Twos (D)',
        termExpiration: 'May 2025',
        portrait: 'Senate186\twos.png',
        state: 'Illinois',
        class: 'Class 3'
      }
    ],
    'Jackson': [
        {
          name: 'Noah Constrictor (R)',
          termExpiration: 'May 2025',
          portrait: 'Senate186\constrictor.png',
          state: 'Arkansas',
          class: 'Class 3'
        },
        {
          name: 'Axel Hersey (R)',
          termExpiration: 'April 2025',
          portrait: 'Senate186\hersey.png',
          state: 'Florida',
          class: 'Class 2'
        }
      ],
      'Frontier': [
          {
            name: 'Aislinn Kinsley (R)',
            termExpiration: 'May 2025',
            portrait: 'Senate186\kinsley.png',
            state: 'UNDEFINED',
            class: 'Class 3'
          },
          {
            name: 'Steven Miller (R)',
            termExpiration: 'March 2025',
            portrait: 'Senate186\miller.png',
            state: 'Montana',
            class: 'Class 1'
          }
        ],
        'Pacifica': [
          {
            name: 'Thomas Seaver (R)',
            termExpiration: 'March 2025',
            portrait: 'Senate186\seaver.png',
            state: 'Washington',
            class: 'Class 1'
          },
          {
            name: 'Kayla Whitmer (R)',
            termExpiration: 'April 2025',
            portrait: 'Senate186\whitmer.png',
            state: 'Hawaii',
            class: 'Class 2'
          }
        ]
    // Add more superstates and their senators as needed
  };

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
});