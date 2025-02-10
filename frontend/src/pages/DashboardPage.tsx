import React from "react";
import ActivityList from "../components/ActivityList";
import SendForm from "../components/SendForm";

export default function DashboardPage() {
  return (
    <main className="container mx-auto px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ActivityList />
        <SendForm />
      </div>
    </main>
  );
}
