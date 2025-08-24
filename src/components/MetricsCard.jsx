import React from 'react'

const MetricsCard = ({ title, value, unit, subtitle, color = 'blue', trend = null, icon = null }) => {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50', 
    gray: 'border-gray-200 bg-gray-50',
    orange: 'border-orange-200 bg-orange-50'
  }

  const textColorClasses = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    gray: 'text-gray-700', 
    orange: 'text-orange-700'
  }

  return (
    <div className={`metric-card bg-white rounded-lg border-2 ${colorClasses[color]} p-6`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {icon && <span className="mr-2 text-lg">{icon}</span>}
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        </div>
        {trend && (
          <span className={`text-sm ${trend > 0 ? 'improvement-positive' : 'improvement-negative'}`}>
            {trend > 0 ? '↗️' : '↘️'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      
      <div className="flex items-baseline">
        <span className={`power-value text-3xl font-bold ${textColorClasses[color]}`}>
          {value}
        </span>
        {unit && (
          <span className="ml-2 text-lg text-gray-500">{unit}</span>
        )}
      </div>
      
      {subtitle && (
        <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  )
}

export default MetricsCard
