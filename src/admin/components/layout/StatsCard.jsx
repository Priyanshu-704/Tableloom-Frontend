import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
export function StatsCard({ title, value, icon: Icon, trend, trendPositive }) {
  const iconElement = Icon
    ? React.createElement(Icon, {
        className: "h-6 w-6 text-primary-600",
      })
    : null;
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-primary-50 rounded-lg">{iconElement}</div>
      </div>

      {trend && (
        <div
          className={`flex items-center mt-4 text-sm ${trendPositive ? "text-green-600" : "text-red-600"}`}
        >
          {trendPositive ? (
            <TrendingUp className="h-4 w-4 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 mr-1" />
          )}
          <span>{trend} from yesterday</span>
        </div>
      )}
    </div>
  );
}
