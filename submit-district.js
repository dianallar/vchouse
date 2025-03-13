document.getElementById('districtForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const formData = {
    fullName: document.getElementById('fullName').value,
    party: document.getElementById('party').value,
    district: document.getElementById('district').value,
    faceclaim: document.getElementById('faceclaim').value,
    email: document.getElementById('email').value
  };

  // Send to Email JS service
  emailjs.send('service_4bunwvd', 'template_ubp034j', {
    to_email: 'marcusass2002@gmail.com',
    from_name: formData.fullName,
    district: formData.district,
    party: formData.party,
    faceclaim: formData.faceclaim,
    reply_to: formData.email
  })
  .then(function() {
    document.getElementById('successMessage').style.display = 'block';
    document.getElementById('districtForm').reset();
  })
  .catch(function(error) {
    console.error('Failed to send email', error);
    alert('Failed to submit form. Please try again.');
  });
});