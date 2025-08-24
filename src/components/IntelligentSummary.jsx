import React, { useState, useEffect } from 'react'
import { PerformanceIntelligence } from '../utils/performanceIntelligence'
import TooltipSimple from './TooltipSimple'

/**
 * Intelligent Performance Summary
 * 
 * The "brain" of the dashboard - instantly tells riders:
 * 1. Where they are (current form/status)
 * 2. What they should focus on
 * 3. What actions to take next
 * 
 * Philosophy: Replace confusion with clarity, complexity with actionable insights
 */
const IntelligentSummary = ({ riderData, recentEvents = [] }) => {
  const [summary, setSummary] = useState(null)
  const [activeCard, setActiveCard] = useState('insight')

  useEffect(() => {
    if (riderData) {
      const performanceSummary = PerformanceIntelligence.generatePerformanceSummary(riderData, recentEvents)
      setSummary(performanceSummary)
    }
  }, [riderData, recentEvents])

  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const { primaryInsight, formState, categoryStatus, focusAreas, strengths, quickWins } = summary

  // Get icon and styling based on insight type
  const getInsightStyling = (type) => {
    const styles = {
      opportunity: { 
        icon: '🔥', 
        bgColor: 'bg-gradient-to-r from-green-50 to-emerald-100', 
        borderColor: 'border-green-300',
        textColor: 'text-green-800'
      },
      warning: { 
        icon: '⚠️', 
        bgColor: 'bg-gradient-to-r from-yellow-50 to-amber-100', 
        borderColor: 'border-yellow-300',
        textColor: 'text-yellow-800'
      },
      goal: { 
        icon: '🎯', 
        bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-100', 
        borderColor: 'border-blue-300',
        textColor: 'text-blue-800'
      },
      development: { 
        icon: '💪', 
        bgColor: 'bg-gradient-to-r from-purple-50 to-violet-100', 
        borderColor: 'border-purple-300',
        textColor: 'text-purple-800'
      },
      stable: { 
        icon: '📊', 
        bgColor: 'bg-gradient-to-r from-gray-50 to-slate-100', 
        borderColor: 'border-gray-300',
        textColor: 'text-gray-800'
      }
    }
    return styles[type] || styles.stable
  }

  const insightStyle = getInsightStyling(primaryInsight.type)

  return (
    <div className="space-y-6">
      {/* Primary Insight - The Hero Section */}
      <div className={`${insightStyle.bgColor} ${insightStyle.borderColor} border-2 rounded-xl p-6 shadow-lg`}>
        <div className="flex items-start space-x-4">
          <div className="text-4xl">{insightStyle.icon}</div>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${insightStyle.textColor} mb-2`}>
              Performance Insight
            </h2>
            <p className={`text-lg ${insightStyle.textColor} mb-3 leading-relaxed`}>
              {primaryInsight.message}
            </p>
            <div className={`inline-flex items-center px-4 py-2 bg-white bg-opacity-80 rounded-lg ${insightStyle.textColor} font-semibold text-sm`}>
              <span className="mr-2">🎯</span>
              Action: {primaryInsight.action}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'insight', label: 'Key Insight', icon: '💡' },
          { id: 'focus', label: 'Focus Areas', icon: '🎯' },
          { id: 'form', label: 'Current Form', icon: '📈' },
          { id: 'quickwins', label: 'Quick Wins', icon: '⚡' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCard(tab.id)}
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeCard === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Cards */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        
        {activeCard === 'insight' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">💡</span>
              What Your Data Tells Us
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form State */}
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${
                  formState.state === 'excellent' ? 'bg-green-50 border-green-200' :
                  formState.state === 'overreaching' ? 'bg-red-50 border-red-200' :
                  formState.state === 'building' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Current Form: {formState.state.charAt(0).toUpperCase() + formState.state.slice(1)}
                  </h4>
                  <p className="text-sm text-gray-700 mb-2">{formState.description}</p>
                  <span className="text-xs text-gray-600">
                    <TooltipSimple 
                      content="Comparison of recent power outputs to seasonal best performances. Decline >15% may indicate need for recovery."
                      scientific={true}
                    >
                      Recent decline: {formState.recentDecline}
                    </TooltipSimple>
                  </span>
                </div>
              </div>

              {/* Category Status */}
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${
                  categoryStatus.promotionPotential === 'high' ? 'bg-green-50 border-green-200' :
                  categoryStatus.promotionPotential === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Category Progression: {categoryStatus.promotionPotential === 'high' ? 'Strong Potential' : 
                                          categoryStatus.promotionPotential === 'medium' ? 'Possible' : 'Long-term Goal'}
                  </h4>
                  <p className="text-sm text-gray-700 mb-2">
                    Currently Category {categoryStatus.current}
                    {categoryStatus.next && ` → Category ${categoryStatus.next} needs +${categoryStatus.powerGap}W`}
                  </p>
                  <p className="text-xs text-gray-600">
                    Estimated timeframe: {categoryStatus.timeframe}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeCard === 'focus' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🎯</span>
              Your Training Priorities
            </h3>
            
            <div className="space-y-4">
              {focusAreas.slice(0, 3).map((area, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  area.impact === 'high' ? 'border-red-500 bg-red-50' :
                  area.impact === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">
                      #{index + 1}: {area.area}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        area.impact === 'high' ? 'bg-red-200 text-red-800' :
                        area.impact === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {area.impact} impact
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        +{area.improvementPotential.toFixed(0)}% potential
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">{area.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">Training Focus:</span>
                      <p className="text-gray-600">{area.trainingFocus}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-600">Expected Gains:</span>
                      <p className="text-green-600">{area.expectedGains}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCard === 'form' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📈</span>
              Current Form Analysis
            </h3>
            
            <div className="space-y-6">
              {/* Form State Detail */}
              <div className={`p-6 rounded-lg border-2 ${
                formState.state === 'excellent' ? 'bg-green-50 border-green-200' :
                formState.state === 'overreaching' ? 'bg-red-50 border-red-200' :
                formState.state === 'building' ? 'bg-blue-50 border-blue-200' :
                formState.state === 'detraining' ? 'bg-orange-50 border-orange-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-bold text-gray-900">
                    Form State: {formState.state.charAt(0).toUpperCase() + formState.state.slice(1)}
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    formState.confidence === 'high' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {formState.confidence} confidence
                  </span>
                </div>
                
                <p className="text-gray-700 mb-4 text-lg leading-relaxed">
                  {formState.description}
                </p>
                
                <div className="bg-white bg-opacity-80 p-4 rounded-lg">
                  <h5 className="font-semibold text-gray-900 mb-2">Recommended Action:</h5>
                  <p className="text-gray-700">{formState.recommendation}</p>
                </div>
              </div>

              {/* Strengths */}
              {strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Your Current Strengths</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {strengths.slice(0, 2).map((strength, index) => (
                      <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="font-semibold text-blue-900 mb-1">{strength.area}</h5>
                        <p className="text-sm text-blue-700 mb-2">{strength.description}</p>
                        <p className="text-xs text-blue-600">
                          <strong>Leverage:</strong> {strength.leverage}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeCard === 'quickwins' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">⚡</span>
              Quick Wins & Opportunities
            </h3>
            
            <div className="space-y-4">
              {quickWins.map((win, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-900">{win.type}</h4>
                    <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-medium">
                      {win.timeframe}
                    </span>
                  </div>
                  
                  <p className="text-sm text-green-700 mb-2">{win.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-medium text-green-600">Action:</span>
                      <p className="text-green-600">{win.action}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-600">Expected Result:</span>
                      <p className="text-green-600">{win.expectedResult}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IntelligentSummary
