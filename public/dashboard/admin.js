document.addEventListener('DOMContentLoaded', () => {
  fetch('/dashboard/admin/usercount')
    .then(response => response.json())
    .then(data => {
      document.getElementById('total-users').textContent = data.total;
    });
});

document.addEventListener('DOMContentLoaded', () => {
  fetch('/dashboard/admin/orders')
    .then(response => response.json())
    .then(data => {
      document.getElementById('orders-made').textContent = data.total;
    });
});

document.addEventListener('DOMContentLoaded', () => {
    fetch('/dashboard/admin/userlist')
        .then(response => response.json())
        .then(data => {
            data.forEach(user => {

                const row = document.createElement('tr');

                row.innerHTML = `
                    <td style="text-align:left">${user.username}</td>
                    <td style="text-align:center">${user.email}</td>
                    <td class="${user.usertype}" style="text-align:center;">${user.usertype}</td>
                    <td style="text-align:right">${new Date(user.createdAt).toLocaleDateString()}</td>
                `;

                document.getElementById('user-list').appendChild(row);
            });
        });
});

document.addEventListener('DOMContentLoaded', () => {
fetch('/dashboard/admin/signup-stats')
  .then(response => response.json())
  .then(data => {
    const labels = data.map(item => `${item._id.year}-${item._id.month}-${item._id.day}`);
    const counts = data.map(item => item.count);

    const ctx = document.getElementById('signupChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
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
});

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('menu-item-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    try {
      const response = await fetch('/dashboard/admin/create_menuitem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

      if (data.error) {
        alert('Error: ' + data.error);
      } else {
        alert('Menu item created successfully!');
      }
    } catch (err) {
      alert('Network or server error');
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
    fetch('/dashboard/admin/menulist')
        .then(response => response.json())
        .then(data => {
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="text-align:left">${item.name}</td>
                    <td style="text-align:left">${item.description}</td>
                    <td style="text-align:center">${item.category}</td>
                    <td style="text-align:right">${item.stock}</td>
                    <td style="text-align:right">${item.price.toFixed(2)}</td>
                    <td style="text-align:center">${item.available ? 'Yes' : 'No'}</td>
                    <td style="text-align:left">${item.allergens.join(', ')}</td>
                    <td style="text-align:right">Calories: ${item.nutritionalInfo.calories}</td>
                    <td style="text-align:right">Protein: ${item.nutritionalInfo.protein}</td>
                    <td style="text-align:right">${item.healthScore}</td>

                `;
                document.getElementById('menu-list').appendChild(row);
            });
        });
});