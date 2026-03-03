async function analyzeLocationRisk({ country, CountryCode, Continent, IsVPN, isTor, isProxy }) {
  var riskScore = 0;
    if (IsVPN) riskScore += 3; 
    if (isTor) riskScore += 4; 
    if (isProxy) riskScore += 2; 
    if (Continent === 'Asia' || Continent === 'Africa') riskScore += 1;

    if (country === 'India' || country === 'Nigeria' || country === 'Pakistan') riskScore += 1; 

    var riskLevel = 'Low';
    riskLevel = riskScore >= 5 ? 'High' : riskScore >= 3 ? 'Medium' : 'Low';

    return { riskScore, riskLevel };
}

async function impossibleTravelCheck(lastLogin, currentLogin, lattitude, longitude) {
  if (!lastLogin || !currentLogin) return false;
  const timeDiff = Math.abs(new Date(currentLogin) - new Date(lastLogin)) / (1000 * 60 * 60);
  if (timeDiff < 1) {
    const distance = calculateDistance(lastLogin.lattitude, lastLogin.longitude, lattitude, longitude);
    return distance > 450; 
  }
  return false;
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
