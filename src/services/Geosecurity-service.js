const express = require('express');
const iplocate = require('node-iplocate');
const router = express.Router();
const { createSecurityLog } = require('../auth/security');
const { SecurityLogs } = require('../../config/database_queries');
const { analyzeLocationRisk, impossibleTravelCheck } = require('../locationRiskAnalyzer/locationRiskAnalyzer');

router.get('/location-info', async (req, res) => {
    try {
        const ip = req.clientIp || req.ip || '127.0.0.1';
        
        const locationData = await iplocate(ip);
        
        res.json({
            ip: ip,
            country: locationData.country,
            countryCode: locationData.country_code,
            continent: locationData.continent,
            city: locationData.city,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            isVPN: locationData.is_vpn,
            isTor: locationData.is_tor,
            isProxy: locationData.is_proxy
        });
    } catch (error) {
        console.error('Error getting location info:', error);
        res.status(500).json({ error: 'Failed to get location information' });
    }
});

router.post('/analyze-risk', async (req, res) => {
    try {
        const { country, countryCode, continent, isVPN, isTor, isProxy } = req.body;
        
        const riskAnalysis = await analyzeLocationRisk({
            country,
            CountryCode: countryCode,
            Continent: continent,
            IsVPN: isVPN,
            isTor,
            isProxy
        });
        
        await createSecurityLog({
            userId: req.session?.user?.id || 'anonymous',
            action: 'LOCATION_RISK_ANALYSIS',
            details: {
                ip: req.clientIp,
                riskLevel: riskAnalysis.riskLevel,
                riskScore: riskAnalysis.riskScore
            },
            ipAddress: req.clientIp
        });
        
        if (riskAnalysis.riskLevel === 'High') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Your location has been flagged as high risk. Please contact support if this is an error.',
                riskLevel: riskAnalysis.riskLevel,
                riskScore: riskAnalysis.riskScore
            });
        }
        
        res.json(riskAnalysis);
    } catch (error) {
        console.error('Error analyzing location risk:', error);
        res.status(500).json({ error: 'Failed to analyze location risk' });
    }
});

router.post('/impossible-travel', async (req, res) => {
    try {
        const { lastLogin, currentLogin, latitude, longitude } = req.body;
        
        const travelCheck = await impossibleTravelCheck(lastLogin, currentLogin, latitude, longitude);
        
        if (travelCheck !== false) {
            await createSecurityLog({
                userId: req.session?.user?.id || 'anonymous',
                action: 'IMPOSSIBLE_TRAVEL_DETECTED',
                details: {
                    ip: req.clientIp,
                    travelRisk: travelCheck,
                    lastLogin,
                    currentLogin,
                    latitude,
                    longitude
                },
                ipAddress: req.clientIp
            });
            
            return res.status(403).json({
                error: 'Suspicious activity detected',
                message: 'Your login attempt has been blocked due to impossible travel detection. Please contact support if this is an error.',
                riskLevel: travelCheck
            });
        }
        
        res.json({
            isImpossibleTravel: false,
            riskLevel: 'LOW'
        });
    } catch (error) {
        console.error('Error checking impossible travel:', error);
        res.status(500).json({ error: 'Failed to check impossible travel' });
    }
});

module.exports = router;



