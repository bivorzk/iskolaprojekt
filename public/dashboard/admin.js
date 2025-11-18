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

