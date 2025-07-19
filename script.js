async function fetchAnalytics() {
  const res = await fetch('http://localhost:3000/api/analytics');
  const data = await res.json();

  document.getElementById('txCount').textContent = data.totalTxs;
  document.getElementById('avaxVolume').textContent = parseFloat(data.totalAVAXVolume).toFixed(2);
  document.getElementById('userCount').textContent = data.totalUsers;

  const chartLabels = data.tokenVolumes.map(t => t.token);
  const chartData = data.tokenVolumes.map(t => parseFloat(t.amount));

  if (window.myChart) window.myChart.destroy();
  const ctx = document.getElementById('tokenChart');
  window.myChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Token Volume (raw)',
        data: chartData,
        backgroundColor: 'rgba(233, 30, 99, 0.6)'
      }]
    }
  });
}

fetchAnalytics();
setInterval(fetchAnalytics, 20000);
