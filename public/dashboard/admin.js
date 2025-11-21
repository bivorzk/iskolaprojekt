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
          <td id="ItemName" style="text-align:left">${item.name}</td>
          <td style="text-align:left">${item.description}</td>
          <td style="text-align:center">${item.category}</td>
          <td id="stock" style="text-align:right">${item.stock}</td>
          <td style="text-align:right">${item.price.toFixed(2)}</td>
          <td style="text-align:center">${item.available ? 'Yes' : 'No'}</td>
          <td style="text-align:left">${item.allergens.join(', ')}</td>
          <td style="text-align:right">Calories: ${item.nutritionalInfo.calories}</td>
          <td style="text-align:right">Protein: ${item.nutritionalInfo.protein}</td>
          <td style="text-align:right">${item.healthScore}</td>
        `;
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
  
  

});
