import React from 'react';
import ReactDOM from 'react-dom';
import ParentHeader from './ParentHeader';
import ParentSidebar from './ParentSidebar';
import ParentStudentsSection from './ParentStudentsSection';
import ParentStatsSection from './ParentStatsSection';
import ParentOrdersSection from './ParentOrdersSection';
import ParentSettingsSection from './ParentSettingsSection';
import ParentPaymentButton from './ParentPaymentButton';
import MobileParentNav from './MobileParentNav';

function ParentDashboard() {
  return (
    <div className="flex flex-col md:flex-row">
      <ParentSidebar />
      <div className="flex-1 p-4">
        <ParentHeader />
        <ParentStudentsSection />
        <ParentStatsSection />
        <ParentOrdersSection />
        <ParentSettingsSection />
        <ParentPaymentButton />
        <MobileParentNav />
      </div>
    </div>
  );
}

ReactDOM.render(<ParentDashboard />, document.getElementById('root'));




