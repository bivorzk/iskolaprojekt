// 6LfkaeErAAAAAEzBV6Puvepk4UoMKNyMPlKqbQmk

const RECAPTCHA_SITE_KEY = process.env.Client_Side_Captha;
        
        document.querySelector('form').addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default form submission
            
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            // Show loading state
            const submitBtn = document.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Verifying...';
            submitBtn.disabled = true;
            
            // Execute reCAPTCHA v3
            grecaptcha.ready(function() {
                console.log('reCAPTCHA ready, executing...');
                grecaptcha.execute(RECAPTCHA_SITE_KEY, {action: 'register'}).then(function(token) {
                //    console.log('reCAPTCHA token received:', token ? 'YES (length: ' + token.length + ')' : 'NO');
                //    console.log('Token preview:', token);
                    
                    // Add CAPTCHA token to form and submit
                    let tokenInput = document.querySelector('input[name="g-recaptcha-response"]');
                    if (!tokenInput) {
                        tokenInput = document.createElement('input');
                        tokenInput.type = 'hidden';
                        tokenInput.name = 'g-recaptcha-response';
                        document.querySelector('form').appendChild(tokenInput);
                        console.log('Created new token input field');
                    }
                    tokenInput.value = token;
                    console.log('Token set in form field:', tokenInput.value ? 'YES' : 'NO');
                    
                    // Submit the form
                    const form = document.querySelector('form');
                    const formData = new FormData(form);
                    const params = new URLSearchParams();
                    for (let [key, value] of formData.entries()) {
                        params.append(key, value);
                    }

                    fetch('/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: params.toString()
                    }).then(response => {
                        if (response.ok) {
                            return response.text();
                        } else {
                            return response.text().then(text => Promise.reject(text));
                        }
                    }).then(message => {
                        alert('Registration successful: ' + message);
                        form.reset();
                    }).catch(error => {
                        alert('Registration failed: ' + error);
                    }).finally(() => {
                        // Reset button state
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    });
                    
                }).catch(function(error) {
                    console.error('reCAPTCHA error:', error);
                    alert('CAPTCHA verification failed. Please try again.');
                    // Reset button state
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                });
            });
        });