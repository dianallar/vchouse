document.addEventListener('DOMContentLoaded', () => {
    // Initialize the map
    const map = L.map('map').setView([37.8, -96], 4);

    // Add the base tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Global variables
    let currentUser = null;
    let allDistricts = [];
    let representativesData = {};
    const districtLayers = new Map();
    const API_URL = 'http://localhost:3000/api';

    // Load representatives data
    fetch('representatives_new.json')
        .then(response => response.json())
        .then(data => {
            representativesData = data;
        })
        .catch(error => {
            console.error('Error loading representatives data:', error);
        });

    // Load district data
    fetch('vchousemap2KeyComposites.geojson')
        .then(response => response.json())
        .then(data => {
            // Create the GeoJSON layer with custom styling
            geojsonLayer = L.geoJSON(data, {
                style: feature => {
                    const props = feature.properties;
                    return {
                        color: '#666',
                        weight: 1,
                        fillColor: props.color || '#999',
                        fillOpacity: 0.5,  // Reduced opacity
                        opacity: 0.8       // Added line opacity
                    };
                },
                onEachFeature: onEachFeature
            }).addTo(map);
        });

    // Find district data function
    function findDistrictData(state, district) {
        try {
            const districtKey = `${state}-${district}`;
            return representativesData[districtKey] || null;
        } catch (error) {
            console.error('Error finding district data:', error);
            return null;
        }
    }

    // Modify onEachFeature to use proper event handling
    function onEachFeature(feature, layer) {
        if (feature.properties) {
            const props = feature.properties;
            const districtKey = `${props.State}-${props.District}`;
            const representativeInfo = representativesData[districtKey];
            let representativeName = 'Vacant';
            let party = 'Unknown';

            if (representativeInfo && representativeInfo !== 'N/A') {
                const [name, partyWithParens] = representativeInfo.split(' (');
                representativeName = name;
                party = partyWithParens ? partyWithParens.replace(')', '') : 'Unknown';
            }

            const popupContent = `
                <div class="district-popup">
                    <h3 class="popup-header">District Information</h3>
                    <div class="popup-content">
                        <div class="popup-row">
                            <span class="popup-label">State:</span>
                            <span class="popup-value">${props.State}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-label">District:</span>
                            <span class="popup-value">${props.District}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-label">Representative:</span>
                            <span class="popup-value">${representativeName}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-label">Party:</span>
                            <span class="popup-value ${party.toLowerCase()}">${party}</span>
                        </div>
                    </div>
                    <div class="popup-footer">
                        <button class="popup-button" data-state="${props.State}" data-district="${props.District}">View Details</button>
                    </div>
                </div>
            `;
            
            const popup = layer.bindPopup(popupContent, { className: 'custom-popup', maxWidth: 300 });
            
            // Add event listener after popup is opened
            popup.on('popupopen', function() {
                const button = document.querySelector('.popup-button');
                if (button) {
                    button.removeEventListener('click', handleDetailsClick);
                    button.addEventListener('click', handleDetailsClick);
                }
            });
        }
    }

    // Handle details button click
    function handleDetailsClick(e) {
        const state = e.target.getAttribute('data-state');
        const district = e.target.getAttribute('data-district');
        if (state && district) {
            showDistrictDetails(state, district);
        }
    }

    // Modal handling functions
    function openModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    function closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Login form handling
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });

            const data = await response.json();
            if (response.ok) {
                currentUser = data.user;
                updateUIForUser();
                closeModal('loginModal');
                loginForm.reset();
            } else {
                errorDiv.textContent = data.message || 'Login failed';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
        }
    });

    // Update the registration form handling section
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Create registration data object with basic fields
        const registrationData = {
            username: document.getElementById('registerUsername').value,
            fullName: document.getElementById('registerFullName').value,
            email: document.getElementById('registerEmail').value,
            party: document.getElementById('registerParty').value,
            password: document.getElementById('registerPassword').value
        };

        // Handle password confirmation
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (registrationData.password !== confirmPassword) {
            document.getElementById('registerError').textContent = 'Passwords do not match';
            return;
        }

        // Validate required fields (exclude portraitFile)
        const requiredFields = ['username', 'fullName', 'email', 'party', 'password'];
        const missingFields = requiredFields.filter(field => !registrationData[field]);
        
        if (missingFields.length > 0) {
            document.getElementById('registerError').textContent = 
                `Missing required fields: ${missingFields.join(', ')}`;
            return;
        }

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registrationData)
            });

            const data = await response.json();
            if (response.ok) {
                closeModal('registerModal');
                showMessage('Registration successful! Please log in.');
                document.getElementById('registerForm').reset();
            } else {
                document.getElementById('registerError').textContent = 
                    data.message || 'Registration failed';
            }
        } catch (error) {
            console.error('Registration error:', error);
            document.getElementById('registerError').textContent = 
                'An error occurred during registration';
        }
    });

    // Update UI based on user state
    function updateUIForUser() {
        const userMenu = document.querySelector('.user-menu');
        if (currentUser) {
            userMenu.innerHTML = `
                <span>Welcome, ${currentUser.fullName}</span>
                <button class="btn" onclick="logout()">Logout</button>
            `;
        } else {
            userMenu.innerHTML = `
                <button class="btn" id="loginBtn">Login</button>
                <button class="btn" id="registerBtn">Register</button>
            `;
        }
    }

    // Logout functionality
    window.logout = async () => {
        try {
            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            currentUser = null;
            updateUIForUser();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Button click handlers
    document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtn').addEventListener('click', () => openModal('registerModal'));

    // Check if user is already logged in
    async function checkAuthStatus() {
        try {
            const response = await fetch(`${API_URL}/auth-status`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (response.ok && data.user) {
                currentUser = data.user;
                updateUIForUser();
            }
        } catch (error) {
            console.error('Auth status check failed:', error);
        }
    }

    // Initialize auth status
    checkAuthStatus();

    // Show detailed district information in the sidebar
    function showDistrictDetails(state, district) {
        const districtKey = `${state}-${district}`;
        const representativeInfo = representativesData[districtKey];
        let representativeName = 'Vacant';
        let party = 'Unknown';
        let partyClass = '';

        if (representativeInfo && representativeInfo !== 'N/A') {
            const [name, partyWithParens] = representativeInfo.split(' (');
            representativeName = name;
            party = partyWithParens ? partyWithParens.replace(')', '') : 'Unknown';
            partyClass = party.toLowerCase();
        }

        const detailsContent = `
            <div class="district-header">
                <img src="Portraits/${districtKey}.jpg" alt="${representativeName}'s Portrait" class="representative-portrait" onerror="this.src='Portraits/default.jpg'">
                <div class="representative-info">
                    <h2 class="representative-name">${representativeName}</h2>
                    <span class="party-badge ${partyClass}">${party}</span>
                    <a href="district.html?state=${state}&district=${district}" class="district-link">View Full Profile</a>
                </div>
            </div>
        `;

        document.getElementById('districtContent').innerHTML = detailsContent;
    }

    // Search functionality
    const searchInput = document.getElementById('districtSearch');
    const searchResults = document.getElementById('searchResults');
    let geojsonLayer = null;  // Store reference to GeoJSON layer

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        // Search through the GeoJSON data
        const results = [];
        
        if (geojsonLayer) {
            geojsonLayer.eachLayer(layer => {
                const props = layer.feature.properties;
                const stateName = props.State;
                const districtNum = String(props.District); // Convert to string
                const repName = props.Representative || 'Vacant';
                
                if (stateName.toLowerCase().includes(searchTerm) ||
                    districtNum.toLowerCase().includes(searchTerm) ||
                    repName.toLowerCase().includes(searchTerm)) {
                    results.push({
                        state: stateName,
                        district: districtNum,
                        representative: repName,
                        layer: layer
                    });
                }
            });
        }

        displaySearchResults(results);
    });

    function displaySearchResults(results) {
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        results.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result';
            resultDiv.textContent = `${result.state} - District ${result.district} (${result.representative})`;
            resultDiv.addEventListener('click', () => {
                map.fitBounds(result.layer.getBounds());
                result.layer.openPopup();
                showDistrictDetails(result.state, result.district);
                searchResults.style.display = 'none';
                searchInput.value = '';
            });
            searchResults.appendChild(resultDiv);
        });
        
        searchResults.style.display = 'block';
    }
});