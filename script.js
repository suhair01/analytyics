const provider = new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
const routerAddress = '0x06d8b6810edf37fc303f32f30ac149220c665c27';

async function fetchAnalytics() {
  const currentBlock = await provider.getBlockNumber();
  const logs = await provider.getLogs({
    address: routerAddress,
    fromBlock: currentBlock - 20000,
    toBlock: 'latest',
  });

  const uniqueUsers = new Set();
  let totalVolume = ethers.parseUnits('0', 18);
  let txCount = 0;
  let tokenVolumes = {};

  for (let log of logs) {
    const tx = await provider.getTransaction(log.transactionHash);
    if (!tx) continue;

    txCount++;
    uniqueUsers.add(tx.from);

    // Try to extract value (AVAX) or decode calldata for tokens
    if (tx.value && tx.value > 0) {
      totalVolume += tx.value;
    }

    // Optionally: parse input data here to get token and amount
    // You can decode tx.data if ABI is known
  }

  document.getElementById('txCount').innerText = txCount;
  document.getElementById('totalVolume').innerText = Number(ethers.formatEther(totalVolume)).toFixed(2);
  document.getElementById('userCount').innerText = uniqueUsers.size;

  // Render dummy token volumes for now
  const tokenVolumeList = document.getElementById('tokenVolumeList');
  tokenVolumeList.innerHTML = `
    <li>AVAX: ${Number(ethers.formatEther(totalVolume)).toFixed(2)}</li>
    <li>USDC: 0.00</li>
  `;
}

fetchAnalytics();
