import React, { useState } from "react";
import ReactDOM from "react-dom/client";

import ParentHeader from "./ParentHeader";
import ParentSidebar from "./ParentSidebar";
import ParentStatsSection from "./ParentStatsSection";
import ParentStudentsSection from "./ParentStudentsSection";
import ParentOrdersSection from "./ParentOrdersSection";
import ParentSettingsSection from "./ParentSettingsSection";
import MobileParentNav from "./MobileParentNav";
import { useParentData } from "./useParentData";

const ParentDashboard = () => {
  const [activeSection, setActiveSection] = useState("students");
  const { stats, students, orders, welcomeMessage, loading } = useParentData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading parent dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-white">
      <ParentHeader welcomeMessage={welcomeMessage} />
      <div className="flex">
        <ParentSidebar activeSection={activeSection} setActiveSection={setActiveSection} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {activeSection === "students" && <ParentStudentsSection students={students} />}
          {activeSection === "stats" && <ParentStatsSection stats={stats} />}
          {activeSection === "orders" && <ParentOrdersSection orders={orders} />}
          {activeSection === "settings" && <ParentSettingsSection />}
        </main>
      </div>
      <MobileParentNav activeSection={activeSection} setActiveSection={setActiveSection} />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ParentDashboard />);


