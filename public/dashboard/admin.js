document.addEventListener('DOMContentLoaded', () => {
  fetch('/dashboard/admin/usercount')
    .then(response => response.json())
    .then(data => {
      document.getElementById('total-users').textContent = data.total;
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
