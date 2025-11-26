document.addEventListener("DOMContentLoaded", function () {
  fetch('/order/menu_items')
    .then(res => res.json())
    .then(data => {
      const table = document.getElementById('menu-list');
      // Cart state
      let cartItems = [];
      const cartList = document.getElementById('cart-list');

      async function renderCart() {
        cartList.innerHTML = '';
        cartItems.forEach((item, idx) => {
          const li = document.createElement('li');
          li.textContent = `${item.name} - HUF ${item.price.toFixed(2)}`;
          // Remove button
          const removeBtn = document.createElement('button');
          removeBtn.textContent = 'Remove';
          removeBtn.style.background = '#b71c1c';
          removeBtn.style.color = '#fff';
          removeBtn.style.border = 'none';
          removeBtn.style.borderRadius = '5px';
          removeBtn.style.marginLeft = '16px';
          removeBtn.style.padding = '4px 10px';
          removeBtn.style.cursor = 'pointer';
          removeBtn.addEventListener('click', function () {
            cartItems.splice(idx, 1);
            renderCart();
          });
          li.appendChild(removeBtn);
          cartList.appendChild(li);
        });
        
        // Update total price display
        const total = getCartTotal();
        document.getElementById('price').value = total.toFixed(2);
        
        // Save cart to localStorage for payment systems
        localStorage.setItem('cart', JSON.stringify(window.getCart()));
        
        await updateConvertedAmount();
      }

      function getCartTotal() {
        return cartItems.reduce((sum, item) => sum + item.price, 0);
      }

      // Global function to get cart for payment systems
      window.getCart = function() {
        return cartItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: 1,
          sku: item.id || 'item_' + Math.random().toString(36).substr(2, 9)
        }));
      }

      async function updateConvertedAmount() {
        const amount = getCartTotal();
        const selectedCurrency = document.getElementById('currency').value || 'HUF';
        
        if (amount > 0 && selectedCurrency !== 'HUF') {
          try {
            const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=HUF&to=${selectedCurrency}`);
            const data = await res.json();
            document.getElementById('convertedAmount').value = data.rates[selectedCurrency].toFixed(2);
          } catch (error) {
            console.error('Currency conversion error:', error);
            document.getElementById('convertedAmount').value = amount.toFixed(2);
          }
        } else {
          document.getElementById('convertedAmount').value = amount.toFixed(2);
        }
      }

      data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td id="ItemName" style="text-align:left;cursor:pointer;" data-id="${item._id}">${item.name}</td>
          <td style="text-align:left">${item.description}</td>
          <td style="text-align:center">${item.category}</td>
          <td id="stock" style="text-align:right">${item.stock}</td>
          <td style="text-align:right">${item.price.toFixed(2)}</td>
          <td style="text-align:center">${item.available ? 'Yes' : 'No'}</td>
          <td style="text-align:left">${item.allergens.join(', ')}</td>
          <td style="text-align:right">${item.nutritionalInfo.calories}</td>
          <td style="text-align:right">${item.nutritionalInfo.protein}</td>
          <td style="text-align:right">${item.healthScore}</td>
          <td style="text-align:right"></td>
        `;
        row.style.cursor = 'pointer';
        row.title = 'Click to add to cart';
        row.addEventListener('click', function() {
          cartItems.push(item);
          renderCart();
        });
        table.appendChild(row);
      });

      const addToCartBtn = document.getElementById('addToCartBtn');
      if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
          const cartList = document.getElementById('cart-list');
          const cartInput = document.getElementById('Cart');
          const value = cartInput ? cartInput.value.trim() : '';
          if (value) {
            const listItem = document.createElement('li');
            listItem.textContent = value;
            cartList.appendChild(listItem);
            cartInput.value = '';
            renderCart(); // update conversion
          }
        });
      }

      // Update conversion when currency changes
      const currencySelect = document.getElementById('currency');
      if (currencySelect) {
        currencySelect.addEventListener('change', function() {
          renderCart();
        });
      }
    });
        
  });