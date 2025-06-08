document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    try {
        const response = await fetch('/api/auth-status', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok && data.user) {
            currentUser = data.user;
            populateProfileForm(currentUser);
            updateUIForUser();
            
            // Show admin controls if user is admin
            if (currentUser.isAdmin) {
                document.getElementById('adminControls').style.display = 'block';
            }
        } else {
            window.location.href = 'VCHouse2.html';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showMessage('Error loading profile', 'error');
    }

    // Portrait upload handling
    const portraitInput = document.getElementById('portraitInput');
    if (portraitInput) {
        portraitInput.addEventListener('change', handleProfilePictureUpload);
    }

    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
});

let currentUser = null;

function populateProfileForm(user) {
    const elements = {
        fullName: document.getElementById('fullName'),
        biography: document.getElementById('biography'),
        location: document.getElementById('location'),
        website: document.getElementById('website'),
        currentPortrait: document.getElementById('currentPortrait')
    };

    // Only set values if elements exist
    if (elements.fullName) elements.fullName.value = user.fullName || '';
    if (elements.biography) elements.biography.value = user.biography || '';
    if (elements.location) elements.location.value = user.location || '';
    if (elements.website) elements.website.value = user.website || '';
    
    if (elements.currentPortrait) {
        if (user.portrait) {
            elements.currentPortrait.src = `Portraits/${user.portrait}`;
            elements.currentPortrait.onerror = function() {
                this.src = 'Portraits/default.svg';
            };
        } else {
            elements.currentPortrait.src = 'Portraits/default.svg';
        }
    }
    
    // Load claimed district if any
    loadClaimedDistrict();
}

async function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
        showMessage('Please select an image file', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('Image size should be less than 5MB', 'error');
        return;
    }

    // Show preview
    const preview = document.getElementById('imagePreview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';

    // Determine filename based on claimed district or username
    let filename;
    try {
        const districtResponse = await fetch('/api/claimed-district', {
            credentials: 'include'
        });
        const districtData = await districtResponse.json();
        
        if (districtResponse.ok && districtData.district) {
            // Use district key composite
            filename = `${districtData.district.replace(/\s+/g, '')}.jpg`;
        } else {
            // Use username with underscores
            filename = `${currentUser.username.replace(/\s+/g, '_')}.jpg`;
        }
    } catch (error) {
        console.error('Error determining filename:', error);
        showMessage('Error uploading portrait', 'error');
        return;
    }

    // Upload image
    const formData = new FormData();
    formData.append('portrait', file);
    formData.append('filename', filename);

    try {
        const response = await fetch('/api/update-portrait', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const data = await response.json();
        if (response.ok) {
            showMessage('Portrait updated successfully', 'success');
            document.getElementById('currentPortrait').src = `Portraits/${filename}`;
            
            // Update district page biography if district is claimed
            if (data.district) {
                await updateDistrictBiography(document.getElementById('biography').value);
            }
        } else {
            showMessage(data.message || 'Failed to update portrait', 'error');
        }
    } catch (error) {
        console.error('Error uploading portrait:', error);
        showMessage('Error uploading portrait', 'error');
    }
}

// Add function to update district biography
async function updateDistrictBiography(biography) {
    try {
        // First get the claimed district
        const districtResponse = await fetch('/api/claimed-district', {
            credentials: 'include'
        });
        const districtData = await districtResponse.json();
        
        if (!districtResponse.ok || !districtData.district) {
            // No district claimed, skip bio update
            return;
        }

        // Update district data with new biography
        const response = await fetch('/api/update-district', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                district: districtData.district,
                biography: biography
            }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to update district biography');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update district biography');
        }
    } catch (error) {
        console.error('Error updating district biography:', error);
        showMessage('Error updating district biography', 'error');
    }
}

// Update profile form submission to sync with district bio
async function handleProfileSubmit(event) {
    event.preventDefault();

    const formData = {
        fullName: document.getElementById('fullName').value,
        biography: document.getElementById('biography').value,
        location: document.getElementById('location').value,
        website: document.getElementById('website').value
    };

    try {
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        const data = await response.json();
        if (response.ok) {
            showMessage('Profile updated successfully', 'success');
            currentUser = { ...currentUser, ...formData };
            
            // Update district biography if district is claimed
            await updateDistrictBiography(formData.biography);
        } else {
            showMessage(data.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('Error updating profile', 'error');
    }
}

async function loadClaimedDistrict() {
    try {
        const response = await fetch('/api/claimed-district', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok && data.district) {
            const districtElement = document.getElementById('claimedDistrict');
            if (districtElement) {
                districtElement.textContent = data.district;
            }
        } else {
            const districtElement = document.getElementById('claimedDistrict');
            if (districtElement) {
                districtElement.textContent = 'None';
            }
        }
    } catch (error) {
        console.error('Error loading claimed district:', error);
        const districtElement = document.getElementById('claimedDistrict');
        if (districtElement) {
            districtElement.textContent = 'Error loading district';
        }
    }
}

// Admin functions
function moderateDistricts() {
    window.location.href = 'moderate-districts.html';
}

function manageUsers() {
    window.location.href = 'manage-users.html';
}

function viewReports() {
    window.location.href = 'reports.html';
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;
    
    document.querySelector('.profile-content').insertBefore(
        messageDiv,
        document.querySelector('.profile-content').firstChild
    );
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function updateUIForUser() {
    // Update any UI elements based on user state
    if (currentUser.isAdmin) {
        document.getElementById('adminControls').style.display = 'block';
    }
}