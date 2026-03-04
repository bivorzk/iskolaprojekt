const rules = [
    ({ IsVPN }) => IsVPN ? 3 : 0,
    ({ isTor }) => isTor ? 4 : 0,
    ({ isProxy }) => isProxy ? 2 : 0,
    ({ Continent }) => ['Asia', 'Africa'].includes(Continent) ? 1 : 0,
    ({ country }) => ['India', 'Nigeria', 'Pakistan'].includes(country) ? 1 : 0,
];

async function analyzeLocationRisk(data) {
    const riskScore = rules.reduce((total, rule) => total + rule(data), 0);
    
    const getLevel = (s) => (s >= 5 ? 'High' : s >= 3 ? 'Medium' : 'Low');

    return { riskScore, riskLevel: getLevel(riskScore) };
}

const speedThresholds = {
    LOW: 100,
    MEDIUM: 800,
    HIGH: 1000
};


async function impossibleTravelCheck(lastLogin, currentLogin, lattitude, longitude) {
  if (!lastLogin || !currentLogin) return false;
  const timeDiff = Math.abs(new Date(currentLogin) - new Date(lastLogin)) / (1000 * 60 * 60);
  const distance = calculateDistance(lattitude, longitude, lattitude, longitude);
  const speed = distance /timeDiff;

  const getRiskLevel = (s) => (s >= speedThresholds.HIGH ? 'High' : s >= speedThresholds.MEDIUM ? 'Medium' : s >= speedThresholds.LOW ? 'Low' : false);
  
  return getRiskLevel(speed);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
 Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}


module.exports = { analyzeLocationRisk, impossibleTravelCheck };