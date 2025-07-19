// --- server.js ---
// Backend to track Avaly router swaps

const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = 3000;
const AVALANCHE_RPC = 'https://api.avax.network/ext/bc/C/rpc';
const ROUTER_ADDRESS = '0x06d8b6810edf37fc303f32f30ac149220c665c27';
const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)',
  'function swapExactAVAXForTokens(uint amountOutMin, address[] path, address to, uint deadline)',
  'function swapExactTokensForAVAX(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)',
];

const provider = new ethers.JsonRpcProvider(AVALANCHE_RPC);
const iface = new ethers.Interface(ROUTER_ABI);

let stats = {
  totalTxs: 0,
  totalUsers: new Set(),
  totalAVAXVolume: ethers.Zero,
  tokenVolumes: {},
};

async function processRecentTxs() {
  const blockNumber = await provider.getBlockNumber();
  const logs = await provider.getLogs({
    address: ROUTER_ADDRESS,
    fromBlock: blockNumber - 5000,
    toBlock: blockNumber,
  });

  stats.totalTxs = 0;
  stats.totalAVAXVolume = ethers.Zero;
  stats.totalUsers.clear();
  stats.tokenVolumes = {};

  for (let log of logs) {
    const tx = await provider.getTransaction(log.transactionHash);
    if (!tx || !tx.data) continue;

    try {
      const parsed = iface.parseTransaction({ data: tx.data, value: tx.value });
      const user = tx.from;
      stats.totalTxs++;
      stats.totalUsers.add(user);

      const method = parsed.name;
      const path = parsed.args.path;

      if (method === 'swapExactAVAXForTokens') {
        stats.totalAVAXVolume += tx.value;
        const tokenOut = path[path.length - 1];
        stats.tokenVolumes[tokenOut] = (stats.tokenVolumes[tokenOut] || ethers.Zero) + tx.value;
      } else if (method === 'swapExactTokensForAVAX') {
        const tokenIn = path[0];
        stats.tokenVolumes[tokenIn] = (stats.tokenVolumes[tokenIn] || ethers.Zero) + parsed.args.amountIn;
      } else if (method === 'swapExactTokensForTokens') {
        const tokenIn = path[0];
        stats.tokenVolumes[tokenIn] = (stats.tokenVolumes[tokenIn] || ethers.Zero) + parsed.args.amountIn;
      }
    } catch (err) {
      continue;
    }
  }
}

setInterval(processRecentTxs, 20000);
processRecentTxs();

app.get('/api/analytics', async (req, res) => {
  res.json({
    totalTxs: stats.totalTxs,
    totalUsers: stats.totalUsers.size,
    totalAVAXVolume: ethers.formatEther(stats.totalAVAXVolume),
    tokenVolumes: Object.entries(stats.tokenVolumes).map(([token, vol]) => ({
      token,
      amount: ethers.formatEther(vol),
    })),
  });
});async function fetchAnalytics() {
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



app.listen(PORT, () => console.log(`Analytics server running on http://localhost:${PORT}`));
