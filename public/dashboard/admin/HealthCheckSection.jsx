const { useState, useEffect } = React;

const HealthCheckSection = () => {
    const [healthData, setHealthData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [expandedServices, setExpandedServices] = useState({});

    const fetchHealthData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/dashboard/admin/health');
            const data = await response.json();
            setHealthData(data);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to fetch health data:', error);
            setHealthData({
                overall: 'unhealthy',
                services: { connection: 'unhealthy' },
                details: { connection: 'Failed to connect to health endpoint' },
                summary: 'Cannot connect to health monitoring system'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealthData();
    }, []);

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-100';
            case 'degraded': return 'text-yellow-600 bg-yellow-100';
            case 'unhealthy': return 'text-red-600 bg-red-100';
            case 'unavailable': return 'text-gray-600 bg-gray-100';
            case 'configured': return 'text-blue-600 bg-blue-100';
            case 'not_configured': return 'text-orange-600 bg-orange-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return '✅';
            case 'degraded': return '⚠️';
            case 'unhealthy': return '❌';
            case 'unavailable': return '⭕';
            case 'configured': return '🔧';
            case 'not_configured': return '❓';
            default: return '⚪';
        }
    };

    const toggleServiceExpansion = (service, event) => {
        event.stopPropagation();
        event.preventDefault();
        
        setExpandedServices(prev => ({
            ...prev,
            [service]: !prev[service]
        }));
    };

    const getOverallStatusDisplay = () => {
        if (!healthData) return { text: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100' };
        
        switch (healthData.overall) {
            case 'ok': 
                return { text: 'All Systems Operational', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' };
            case 'degraded': 
                return { text: 'Some Issues Detected', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' };
            case 'unhealthy': 
                return { text: 'Critical Issues', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' };
            default: 
                return { text: 'Unknown Status', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' };
        }
    };

    const renderServiceCard = (serviceName, status, details) => {
        const expandedKey = typeof status === 'object' ? `nested_${serviceName}` : serviceName;
        const isExpanded = expandedServices[expandedKey];
        
        // Handle nested services (like externalServices)
        if (typeof status === 'object') {
            return (
                <div key={serviceName} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={(e) => toggleServiceExpansion(expandedKey, e)}
                    >
                        <div className="flex items-center space-x-3">
                            <span className="text-lg">🔗</span>
                            <h3 className="font-semibold text-gray-900 capitalize">
                                {serviceName.replace(/([A-Z])/g, ' $1').trim()}
                            </h3>
                        </div>
                        <span className="text-sm text-gray-500">
                            {isExpanded ? '▼' : '▶'}
                        </span>
                    </div>
                    
                    {isExpanded && (
                        <div className="mt-3 pl-6 space-y-2">
                            {Object.entries(status).map(([subService, subStatus]) => (
                                <div key={`${serviceName}_${subService}`} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 capitalize">{subService}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subStatus)}`}>
                                        {getStatusIcon(subStatus)} {subStatus.replace('_', ' ')}
                                    </span>
                                </div>
                            ))}
                            {details && (
                                <p className="text-xs text-gray-500 mt-2">{details}</p>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div key={serviceName} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-fit">
                <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={(e) => toggleServiceExpansion(expandedKey, e)}
                >
                    <div className="flex items-center space-x-3">
                        <span className="text-lg">{getStatusIcon(status)}</span>
                        <h3 className="font-semibold text-gray-900 capitalize">
                            {serviceName.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                        {status}
                    </span>
                </div>
                
                {isExpanded && details && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600">{details}</p>
                    </div>
                )}
            </div>
        );
    };

    if (loading && !healthData) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="space-y-3">
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-16 bg-gray-200 rounded"></div>
                        <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    const overallStatus = getOverallStatusDisplay();

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Health Monitoring</h1>
                    <p className="text-gray-600 mt-1">Real-time status of all application services</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                    >
                        {autoRefresh ? '🔄 Auto Refresh' : '⏸️ Manual Only'}
                    </button>
                    <button
                        onClick={fetchHealthData}
                        disabled={loading}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all duration-200"
                    >
                        {loading ? '🔄 Loading...' : '🔄 Refresh Now'}
                    </button>
                </div>
            </div>

            {/* Overall Status */}
            <div className={`p-6 rounded-xl border-2 ${overallStatus.bgColor}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className={`text-xl font-bold ${overallStatus.color}`}>
                            {overallStatus.text}
                        </h2>
                        {healthData?.summary && (
                            <p className="text-sm text-gray-600 mt-1">{healthData.summary}</p>
                        )}
                        {lastUpdate && (
                            <p className="text-xs text-gray-500 mt-2">
                                Last updated: {lastUpdate.toLocaleString()}
                            </p>
                        )}
                    </div>
                    <div className="text-4xl">
                        {healthData?.overall === 'ok' ? '🟢' : healthData?.overall === 'degraded' ? '🟡' : '🔴'}
                    </div>
                </div>
            </div>

            {/* Services Grid */}
            {healthData?.services && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Status Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                        {Object.entries(healthData.services).map(([serviceName, status]) => 
                            renderServiceCard(serviceName, status, healthData.details?.[serviceName])
                        )}
                    </div>
                </div>
            )}

            {/* Timestamp Info */}
            {healthData?.timestamp && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Health Check Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                            <span className="font-medium">Server Timestamp:</span> {new Date(healthData.timestamp).toLocaleString()}
                        </div>
                        <div>
                            <span className="font-medium">Auto Refresh:</span> {autoRefresh ? 'Enabled (30s)' : 'Disabled'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};