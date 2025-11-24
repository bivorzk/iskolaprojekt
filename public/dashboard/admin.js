document.addEventListener("DOMContentLoaded", () => {

  // ----- Total Users -----
  fetch('/dashboard/admin/usercount')
    .then(res => res.json())
    .then(data => {
      document.getElementById('total-users').textContent = data.total;
    });

  // ----- Orders -----
  fetch('/dashboard/admin/orders')
    .then(res => res.json())
    .then(data => {
      document.getElementById('orders-made').textContent = data.total;
    });

  // ----- User List -----
  fetch('/dashboard/admin/userlist')
    .then(res => res.json())
    .then(data => {
      const table = document.getElementById('user-list');
      data.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="text-align:left">${user.username}</td>
          <td style="text-align:center">${user.email}</td>
          <td class="${user.usertype}" style="text-align:center;">${user.usertype}</td>
          <td style="text-align:right">${new Date(user.createdAt).toLocaleDateString()}</td>
        `;
        table.appendChild(row);
      });
    });

  // ----- Signup Stats Chart -----
  fetch('/dashboard/admin/signup-stats')
    .then(res => res.json())
    .then(data => {
      const labels = data.map(item => `${item._id.year}-${item._id.month}-${item._id.day}`);
      const counts = data.map(item => item.count);

      const ctx = document.getElementById('signupChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Registrations',
            data: counts,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
          }]
        },
        options: {
          scales: {
            x: { title: { display: true, text: 'Date' } },
            y: { title: { display: true, text: 'Registrations' }, beginAtZero: true }
          }
        }
      });
    });

  // ----- Create Menu Item -----
  const form = document.getElementById('menu-item-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/dashboard/admin/create_menuitem', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          id: document.getElementById('item_id').value,
          name: document.getElementById('name').value,
          description: document.getElementById('description').value,
          stock: parseInt(document.getElementById('stock').value),
          price: parseFloat(document.getElementById('price').value),
          category: document.getElementById('category').value,
          allergens: document.getElementById('allergens').value
            .split(',')
            .map(a => a.trim())
            .filter(a => a !== ''),
          nutritionalInfo: {
            calories: parseInt(document.getElementById('calories').value) || 0,
            protein: parseInt(document.getElementById('protein').value) || 0
          },
          healthScore: parseInt(document.getElementById('healthScore').value) || 0
        })
      });

      const data = await response.json();
      if (data.error) alert('Error: ' + data.error);
      else alert('Menu item created successfully!');

    } catch (err) {
      alert('Network or server error');
    }
  });

  // ----- Menu List -----
  fetch('/dashboard/admin/menulist')
    .then(res => res.json())
    .then(data => {
      const table = document.getElementById('menu-list');
      data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td id="ItemName" style="text-align:left" data-id="${item._id}">${item.name}</td>
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
        // delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.marginLeft = '8px';
        deleteBtn.onclick = async () => {
          if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
            try {
              const response = await fetch(`/dashboard/admin/delete_menuitem/${item._id}`);
              const data = await response.json();
              if (response.ok) {
                alert(data.message);
                row.remove();
              } else {
                alert('Error: ' + data.error);
              }
            } catch (err) {
              alert('Network or server error');
            }
          }
        };

        row.cells[10].appendChild(deleteBtn);

        // Add edit button to the last cell
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.style.marginLeft = '8px';
        editBtn.onclick = () => {
          if (row.classList.contains('editing')) return;
          row.classList.add('editing');
          // Store original values
          const original = [
            item.name,
            item.description,
            item.category,
            item.stock,
            item.price,
            item.available,
            item.allergens.join(', '),
            item.nutritionalInfo.calories,
            item.nutritionalInfo.protein,
            item.healthScore
          ];
          // Replace cells with inputs
          row.cells[0].innerHTML = `<input type="text" value="${item.name}">`;
          row.cells[1].innerHTML = `<input type="text" value="${item.description}">`;
          row.cells[2].innerHTML = `<input type="text" value="${item.category}">`;
          row.cells[3].innerHTML = `<input type="number" min="0" value="${item.stock}">`;
          row.cells[4].innerHTML = `<input type="number" step="0.01" value="${item.price}">`;
          row.cells[5].innerHTML = `<select><option value="true" ${item.available ? 'selected' : ''}>Yes</option><option value="false" ${!item.available ? 'selected' : ''}>No</option></select>`;
          row.cells[6].innerHTML = `<input type="text" value="${item.allergens.join(', ')}">`;
          row.cells[7].innerHTML = `<input type="number" min="0" value="${item.nutritionalInfo.calories}">`;
          row.cells[8].innerHTML = `<input type="number" min="0" value="${item.nutritionalInfo.protein}">`;
          row.cells[9].innerHTML = `<input type="number" min="0" value="${item.healthScore}">`;
          // Save and Cancel buttons
          const actionCell = row.cells[10];
          actionCell.innerHTML = '';
          const saveBtn = document.createElement('button');
          saveBtn.textContent = 'Save';
          saveBtn.onclick = async () => {
            const updated = {
              name: row.cells[0].querySelector('input').value,
              description: row.cells[1].querySelector('input').value,
              category: row.cells[2].querySelector('input').value,
              stock: parseInt(row.cells[3].querySelector('input').value),
              price: parseFloat(row.cells[4].querySelector('input').value),
              available: row.cells[5].querySelector('select').value === 'true',
              allergens: row.cells[6].querySelector('input').value.split(',').map(a => a.trim()).filter(a => a !== ''),
              nutritionalInfo: {
                calories: parseInt(row.cells[7].querySelector('input').value) || 0,
                protein: parseInt(row.cells[8].querySelector('input').value) || 0
              },
              healthScore: parseInt(row.cells[9].querySelector('input').value) || 0
            };
            // Send update to server
            try {
              const response = await fetch(`/dashboard/admin/menuitem/${item._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
              });
              const result = await response.json();
              if (result.error) {
                alert('Error: ' + result.error);
              } else {
                // Update row with new values
                row.classList.remove('editing');
                row.cells[0].textContent = updated.name;
                row.cells[1].textContent = updated.description;
                row.cells[2].textContent = updated.category;
                row.cells[3].textContent = updated.stock;
                row.cells[4].textContent = updated.price.toFixed(2);
                row.cells[5].textContent = updated.available ? 'Yes' : 'No';
                row.cells[6].textContent = updated.allergens.join(', ');
                row.cells[7].textContent = updated.nutritionalInfo.calories;
                row.cells[8].textContent = updated.nutritionalInfo.protein;
                row.cells[9].textContent = updated.healthScore;
                actionCell.innerHTML = '';
                actionCell.appendChild(editBtn);
                alert('Menu item updated successfully!');
              }
            } catch (err) {
              alert('Network or server error');
            }
          };
          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = 'Cancel';
          cancelBtn.style.marginLeft = '8px';
          cancelBtn.onclick = () => {
            row.classList.remove('editing');
            row.cells[0].textContent = original[0];
            row.cells[1].textContent = original[1];
            row.cells[2].textContent = original[2];
            row.cells[3].textContent = original[3];
            row.cells[4].textContent = parseFloat(original[4]).toFixed(2);
            row.cells[5].textContent = original[5] ? 'Yes' : 'No';
            row.cells[6].textContent = original[6];
            row.cells[7].textContent = original[7];
            row.cells[8].textContent = original[8];
            row.cells[9].textContent = original[9];
            actionCell.innerHTML = '';
            actionCell.appendChild(editBtn);
          };
          actionCell.appendChild(saveBtn);
          actionCell.appendChild(cancelBtn);
        };
        row.lastElementChild.appendChild(editBtn);
        table.appendChild(row);
      });
    });

  // ----- Item Count -----
  fetch('/dashboard/admin/itemcount')
    .then(res => res.json())
    .then(data => {
      document.getElementById('total-menu-items').textContent = data.total;
    });

  fetch('/dashboard/admin/stockalerts')
    .then(res => res.json())
    .then(data => {
      const alertsContainer = document.getElementById('stock-alerts');
      if (alertsContainer) {
        alertsContainer.innerHTML = '';
        data.forEach(item => {
          const alertDiv = document.createElement('div');
          alertDiv.style.color = 'red';
          alertDiv.style.fontWeight = 'bold';
          IName = `<span style="color: #820000; font-weight: bolder;">${item.name}</span>`;
          Istock = `<span style="color: #820000; font-weight: bolder;">${item.stock}</span>`;
          alertDiv.innerHTML = `⚠️ Low Stock: ${IName} - Only ${Istock} left in stock!`;
          alertsContainer.appendChild(alertDiv);
        });
      }
    });
  
    // ----- Edit Menu Item  -----
    function populateMenuItemForm(itemId) {
      fetch(`/dashboard/admin/menuitem/${itemId}`)
        .then(res => res.json())
        .then(item => {
          document.getElementById('item_id').value = item._id;
          document.getElementById('name').value = item.name;
          document.getElementById('description').value = item.description;
          document.getElementById('stock').value = item.stock;
          document.getElementById('price').value = item.price;
          document.getElementById('category').value = item.category;
          document.getElementById('allergens').value = item.allergens.join(', ');
          document.getElementById('calories').value = item.nutritionalInfo.calories;
          document.getElementById('protein').value = item.nutritionalInfo.protein;
          document.getElementById('healthScore').value = item.healthScore;
        });
    }
    document.getElementById('Export').addEventListener('click', () => {
      fetch('/dashboard/admin/menuitem_export')
        .then(res => res.json())
        .then(data => {
          let CS_V_Format = "Name;Description;Category;Stock;Price;Available;Allergens;Calories;Protein;Health Score\n";
          data.forEach(item => {

              CS_V_Format += item.name + ";" + item.description + ";" + item.category + ";" + item.stock + ";" + "HUF " + item.price.toFixed(2) + ";" + (item.available ? "Yes" : "No") + ";" + item.allergens.join(', ') + ";" + item.nutritionalInfo.calories + ";" + item.nutritionalInfo.protein + "g;" + item.healthScore + "\n";
          });
              const blob = new Blob([CS_V_Format + '\n'], { type: 'text/plain' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = 'menu_items_export.csv';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          });
          alert('Menu items exported to menu_items_export.csv');
        });
      
      fetch('/dashboard/admin/paymentstats')
        .then(res => res.json())
        .then(data => {
          totalAmount = 0;
         data.forEach(stat => {
            if (stat._id === 'HUF') {
              HUF = stat.totalAmount;
            } else if (stat._id === 'USD') {
              USD = stat.totalAmount;
            }else if (stat._id === 'EUR') {
              EUR = stat.totalAmount;
            }
            totalAmount += stat.totalAmount;
         });

         document.getElementById('payment-stats').textContent = 
         `${HUF}HUF
         ${USD.toFixed(2)}$`;
          
        })
        .catch(error => {
          console.error('Error fetching payment stats:', error);
        });
      fetch('/dashboard/admin/welcome-message')
        .then(res => res.json())
        .then(data => {
          document.getElementById('welcome-message').textContent = data.message;
        });

      
});

// Validation against XSS, SQL Injection, and other attacks

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
