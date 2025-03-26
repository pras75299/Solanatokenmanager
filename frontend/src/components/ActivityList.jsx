import React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

const activities = [
  { type: "received", amount: "0.0001 SOL", time: "5 minutes ago" },
  { type: "sent", amount: "0.0001 SOL", time: "10 minutes ago" },
  { type: "received", amount: "0.0001 SOL", time: "15 minutes ago" },
  { type: "sent", amount: "0.0001 SOL", time: "20 minutes ago" },
];

export default function ActivityList() {
  return (
    <div className="bg-[#0F1419] rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 rounded-lg bg-[#1A1F25] hover:bg-[#1E242C] transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-[#2A3038]">
                {activity.type === "received" ? (
                  <ArrowDownLeft className="w-5 h-5 text-green-400" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div>
                <p className="text-white font-medium capitalize">
                  {activity.type}
                </p>
                <p className="text-gray-400">{activity.amount}</p>
              </div>
            </div>
            <span className="text-gray-400 text-sm">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
