document.addEventListener('DOMContentLoaded', () => {


   fetch('/dashboard/children/welcome-message')
    .then(response => response.json())
    .then(data => {
      const welcomeMessage = document.getElementById('welcome-message');
      welcomeMessage.textContent = data.message;
    })
    .catch(error => {
      console.error('Error fetching welcome message:', error);
    });

    fetch('/dashboard/children/order_history')
      .then(response => response.json())
      .then(data => {
        const orderHistoryList = document.getElementById('order-history-list');
        data.forEach(order => {
          const listItem = document.createElement('li');
          listItem.textContent = `Order ID: ${order.orderId}, Item: ${order.itemName}, Quantity: ${order.quantity}, Date: ${new Date(order.date).toLocaleDateString()}`;
          orderHistoryList.appendChild(listItem);
        });
      })
      .catch(error => {
        console.error('Error fetching order history:', error);
      });


    // end of DOMContentLoaded
  });
  




function inputValidation() {
  let valid = true;

  const elements = document.querySelectorAll(
    'input[type="text"], input[type="number"], textarea, select, [data-required], [data-type], [data-min], [data-max], [data-minlength], [data-maxlength]'
  );

  elements.forEach(el => {
    const value = el.value.trim();
    const type = el.getAttribute('data-type');
    let errorCode = null;

    // Required field check
    if (el.hasAttribute('data-required') && !value) {
      valid = false;
      errorCode = 'REQUIRED';
    }
    // Type-specific validation
    else if (type === 'text') {
      const regex = /^[a-zA-Z0-9\s.,'-]*$/;
      if (!regex.test(value)) {
        valid = false;
        errorCode = 'INVALID_TEXT';
      }
    } 
    else if (type === 'number') {
      const min = parseFloat(el.getAttribute('data-min')) || 0;
      const max = parseFloat(el.getAttribute('data-max')) || 100000;
      if (!validateNumber(value, min, max)) {
        valid = false;
        errorCode = 'INVALID_NUMBER';
      }
    }

    // Dangerous string check
    if (
      value.includes("<") || value.includes(">") ||
      value.includes("'") || value.includes('"') ||
      value.includes(";") || value.includes("--") ||
      value.includes('<script>') || value.includes('</script>') ||
      value.includes('$ne') || value.includes('$gt') ||
      value.includes('$lt')
    ) {
      valid = false;
      errorCode = 'INVALID_CHAR';
    }

    // Apply error class and store custom code
    if (errorCode) {
      el.classList.add('input-error');
      el.setAttribute('data-error', errorCode);
    } else {
      el.classList.remove('input-error');
      el.removeAttribute('data-error');
    }
  });

  return valid;
}

// Number validation helper
function validateNumber(value, min = 0, max = 100000) {
  const num = Number(value);

  if (isNaN(num)) return false;
  if (!isFinite(num)) return false;
  if (num < min) return false;
  if (num > max) return false;

  return true;
}