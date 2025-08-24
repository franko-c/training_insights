import React, { useState } from 'react'
import {
  calculatePowerRatios,
  calculateEnergySystemContributions,
  calculateCriticalPower,
  calculatePowerDecayRates,
  calculateTrainingZones,
  generateObjectiveTrainingFocus
} from '../utils/powerAnalysis'
import { PowerAnalysisUtils } from '../utils/powerAnalysisUtils'
import { PowerFormatting } from '../utils/powerFormatting'
import { PowerCalculations } from '../utils/powerCalculations'
import Tooltip from './TooltipSimple'

const InsightsPanel = ({ riderData }) => {
  const [activeTab, setActiveTab] = useState('analysis')

  if (!riderData) {
    return <div>No data available for insights</div>
  }

  // Use PowerAnalysisUtils for data conversion
  const convertPowerData = () => {
    return PowerAnalysisUtils.convertPowerDataForAnalysis(riderData)
  }

  const powerProfile = convertPowerData()

  // Scientific analysis using research-backed formulas
  const powerRatios = calculatePowerRatios(powerProfile)
  const energySystems = calculateEnergySystemContributions(powerProfile)
  const criticalPower = calculateCriticalPower(powerProfile)
  const decayRates = calculatePowerDecayRates(powerProfile)
  const ftp = riderData.ftp || powerProfile.find(p => p.duration === 1200)?.power || 0
  const trainingZones = calculateTrainingZones(ftp)
  const trainingFocus = generateObjectiveTrainingFocus(powerProfile, decayRates, criticalPower)

  // Calculate category progression using PowerCalculations utility
  const calculateCategoryProgression = () => {
    const weight = riderData.weight || 75
    const currentWkg = PowerCalculations.calculateWkg(ftp, weight)
    const currentCategory = riderData.category || 'Unknown'
    const racingScore = riderData.racingScore || riderData.racing_score || 0
    
    const categoryGap = PowerCalculations.calculateCategoryGap(ftp, weight, currentCategory)
    
    if (categoryGap) {
      return {
        current: currentCategory,
        currentWkg: currentWkg?.toFixed(2) || 'N/A',
        racingScore: racingScore,
        next: categoryGap.nextCategory,
        powerGap: categoryGap.powerGap,
        wkgGap: (categoryGap.powerGap / weight).toFixed(2),
        achievable: categoryGap.powerGap < (ftp * 0.15) // Within 15% improvement
      }
    }
    
    return null
  }

  const categoryProgression = calculateCategoryProgression()

  // Performance insights based on scientific analysis
  const generatePerformanceInsights = () => {
    const insights = []

      // Power ratio analysis (objective metrics)
      if (powerRatios) {
        insights.push({
          icon: '📊',
          title: 'Power Profile Analysis',
          description: `15s:20min ratio: ${powerRatios.sprintRatio.value}, 5min:20min ratio: ${powerRatios.vo2maxRatio.value}`,
          details: `Anaerobic ratio: ${powerRatios.anaerobicRatio.value}, Sustainability: ${(powerRatios.sustainability.mediumToLong * 100).toFixed(1)}%`,
          recommendation: powerRatios.vo2maxRatio.value < 1.15 ? 'VO2max development opportunity identified' : 'Well-developed aerobic power profile',
          scientific: true,
          tooltip: "Power ratios show mathematical relationships between different effort durations, indicating physiological strengths and development opportunities."
        })
      }

      // Critical Power insights (lowered threshold for real-world data)
      if (criticalPower && criticalPower.rSquared > 0.75) {
        const wPrimeKj = (criticalPower.wPrime / 1000).toFixed(1)
        const cpPercentage = ((criticalPower.criticalPower / ftp) * 100).toFixed(1)
        insights.push({
          icon: '⚡',
          title: 'Critical Power Analysis',
          description: `CP: ${criticalPower.criticalPower}W (${cpPercentage}% of FTP), W': ${wPrimeKj}kJ`,
          details: `Model fit: R² = ${criticalPower.rSquared.toFixed(3)} - Based on Monod-Scherrer model`,
          recommendation: criticalPower.wPrime < 20000 ? 'Consider developing short-duration power capacity' : 'Excellent short-duration work capacity',
          scientific: true,
          tooltip: "Critical Power modeling helps determine your sustainable power output and work capacity characteristics, useful for pacing strategy and performance analysis."
        })
      }

      // Energy system analysis
      if (energySystems.phosphocreatine && energySystems.glycolytic) {
        const pcrContrib = energySystems.phosphocreatine.contribution
        const glycContrib = energySystems.glycolytic.contribution
        
        // Short duration power analysis (more realistic thresholds)
        if (pcrContrib < 20) {
          insights.push({
            icon: '💥',
            title: 'Short Duration Power Development Opportunity',
            description: `Short power contribution: ${pcrContrib.toFixed(1)}% - room for improvement`,
            details: 'PCr system provides explosive power for 0-15 seconds',
            recommendation: 'Add short duration training: 8 × 15s all-out efforts with full recovery',
            scientific: true,
            tooltip: "High-intensity power system provides immediate energy for explosive efforts like surges and attacks."
          })
        }

        // Sustained high-intensity capacity analysis  
        if (glycContrib > 30) {
          insights.push({
            icon: '🔥',
            title: 'Strong High-Intensity Power',
            description: `Good high-intensity capacity (${glycContrib.toFixed(1)}% contribution)`,
            details: 'Strong 15s-2min power - good for attacks and climbs',
            recommendation: 'Maintain with 1-2 high-intensity sessions per week',
            scientific: true,
            tooltip: "Glycolytic system burns glucose without oxygen, producing lactate. Good contribution indicates strong attacking ability."
          })
        } else if (glycContrib < 25) {
          insights.push({
            icon: '🔥',
            title: 'High-Intensity Power Development Needed',
            description: `Limited high-intensity capacity (${glycContrib.toFixed(1)}% contribution)`,
            details: 'May struggle with attacks and sustained high-intensity efforts',
            recommendation: 'Focus on 5 × 2min @ 110-120% FTP intervals',
            scientific: true,
            tooltip: "Limited high-intensity contribution suggests need for power development to handle race surges and attacks."
          })
        }
      }

      // Power-to-weight analysis
      const currentWkg = ftp / (riderData.weight || 75)
      if (currentWkg < 4.0) {
        insights.push({
          icon: '⚖️',
          title: 'Power-to-Weight Optimization',
          description: `Current: ${currentWkg.toFixed(2)} W/kg - scope for improvement`,
          details: 'Critical for climbing and category progression',
          recommendation: currentWkg < 3.5 ? 'Focus on power gains and weight optimization' : 'Small power gains could unlock next category',
          scientific: false,
          tooltip: "Power-to-weight ratio is crucial for climbing performance and Zwift category progression."
        })
      }

      // Aerobic vs anaerobic balance
      const p5min = powerProfile.find(p => Math.abs(p.duration - 300) < 30)?.power
      const p20min = powerProfile.find(p => Math.abs(p.duration - 1200) < 30)?.power
      if (p5min && p20min) {
        const vo2maxRatio = p5min / p20min
        if (vo2maxRatio < 1.15) {
          insights.push({
            icon: '🫁',
            title: 'VO2max Development Opportunity', 
            description: `5min/20min ratio: ${vo2maxRatio.toFixed(2)} - below optimal (1.15-1.25)`,
            details: 'Limited aerobic power for sustained efforts',
            recommendation: 'Add 5 × 5min @ 105-110% FTP intervals',
            scientific: true,
            tooltip: "VO2max power (3-8 minute efforts) is crucial for sustained climbs and breakaway performance."
          })
        } else if (vo2maxRatio > 1.25) {
          insights.push({
            icon: '🫁',
            title: 'Strong VO2max Power',
            description: `5min/20min ratio: ${vo2maxRatio.toFixed(2)} - excellent aerobic power`,
            details: 'Good capacity for sustained high-intensity efforts',
            recommendation: 'Leverage this strength in climbs and breakaways',
            scientific: true,
            tooltip: "Strong VO2max indicates good ability to sustain high power for 3-8 minute efforts."
          })
        }
      }

      // Form analysis - recent vs season (improved logic)
      const recentActivities = powerProfile.filter(p => {
        // Only analyze if we have date information
        if (!p.date) return false
        const activityDate = new Date(p.date)
        const monthsAgo = (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        return monthsAgo <= 2 // Recent = last 2 months
      })

      if (recentActivities.length > 0) {
        const formDecline = recentActivities.filter(p => p.recent < p.power * 0.9).length / recentActivities.length
        const significantDecline = recentActivities.filter(p => p.recent < p.power * 0.85).length / recentActivities.length
        
        // Only flag as concerning if multiple intervals show significant decline
        if (formDecline > 0.4 && significantDecline > 0.2) {
          insights.push({
            icon: '📉',
            title: 'Form Decline Detected',
            description: `Recent power is 10%+ below season peaks in ${(formDecline * 100).toFixed(0)}% of intervals`,
            details: `${(significantDecline * 100).toFixed(0)}% show >15% decline - may indicate overreaching`,
            recommendation: 'Consider reducing training load and focus on recovery',
            scientific: true,
            tooltip: "Form analysis compares recent performances to season bests to detect fatigue, overreaching, or need for recovery periods. Excludes training breaks."
          })
        } else if (formDecline > 0.6 && significantDecline < 0.1) {
          // Likely training break rather than poor form
          insights.push({
            icon: '⏸️',
            title: 'Training Break Detected',
            description: `Power levels suggest recent training reduction or break`,
            details: 'Moderate decline without significant deterioration',
            recommendation: 'Gradual return to training with progressive load increase',
            scientific: false,
            tooltip: "Detected pattern suggests planned training break rather than overreaching or poor recovery."
          })
        }
      }    return insights
  }

  const insights = generatePerformanceInsights()

  const tabs = [
    { id: 'analysis', label: 'Scientific Analysis', icon: '🔬' },
    { id: 'training', label: 'Evidence-Based Training', icon: '🎯' },
    { id: 'zones', label: 'Power Zones', icon: '📊' },
    { id: 'physiology', label: 'Energy Systems', icon: '⚗️' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Power Profile Analysis</h3>
              {powerRatios && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-100 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900">
                        <Tooltip 
                          content="Mathematical relationships between power outputs at different durations. Shows physiological strengths without subjective labeling."
                          scientific={true}
                        >
                          Power Ratios
                        </Tooltip>
                      </h4>
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span>15s:20min ratio:</span>
                          <span className="font-bold text-blue-800">{powerRatios.sprintRatio.value}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>5min:20min ratio:</span>
                          <span className="font-bold text-blue-800">{powerRatios.vo2maxRatio.value}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>1min:20min ratio:</span>
                          <span className="font-bold text-blue-800">{powerRatios.anaerobicRatio.value}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-blue-500">
                        Based on Coggan power profiling methodology
                      </div>
                    </div>
                    
                    {decayRates.neuromuscular && (
                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <div className="text-xs text-red-600">
                          <Tooltip 
                            content="How quickly your explosive power drops from 1-15 seconds. This shows how fast your phosphocreatine (PCr) energy stores deplete - your body's most powerful but shortest-lasting energy system."
                            scientific={true}
                          >
                            Neuromuscular Decay (1-15s)
                          </Tooltip>
                        </div>
                        <div className="text-lg font-bold text-red-800">{decayRates.neuromuscular.decay.toFixed(1)}%</div>
                        <div className="text-xs text-red-500">
                          <Tooltip 
                            content="Phosphocreatine (PCr) is stored energy in muscles that provides immediate power for explosive efforts. It's completely depleted within 10-15 seconds of maximum effort."
                            scientific={true}
                          >
                            PCr system depletion rate
                          </Tooltip>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {categoryProgression && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-4 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-900">Category Status</h4>
                        <p className="text-sm text-green-600">
                          Current: Category {categoryProgression.current} ({categoryProgression.currentWkg} W/kg)
                        </p>
                        {categoryProgression.racingScore > 0 && (
                          <p className="text-sm text-green-600">
                            Racing Score: {categoryProgression.racingScore} (used in 85%+ of races)
                          </p>
                        )}
                        {categoryProgression.powerGap > 0 && (
                          <p className="text-sm text-green-600">
                            Next: +{categoryProgression.powerGap}W for Category {categoryProgression.next}
                          </p>
                        )}
                        <div className="text-xs text-green-500 mt-1">
                          {categoryProgression.achievable ? 'Promotion achievable with focused training' : 'Requires significant development'}
                        </div>
                      </div>
                    )}

                    {criticalPower && (
                      <div className="bg-purple-50 p-3 rounded border border-purple-200">
                        <div className="text-xs text-purple-600">
                          <Tooltip 
                            content="Critical Power (CP) is the highest power you can sustain indefinitely without fatigue. W' (W-prime) is your finite anaerobic work capacity - like a battery that depletes during efforts above CP."
                            scientific={true}
                          >
                            Critical Power Model
                          </Tooltip>
                        </div>
                        <div className="text-sm font-bold text-purple-800">
                          <Tooltip 
                            content="CP = sustainable power threshold. W' = anaerobic energy reserve measured in kilojoules. Based on the Monod-Scherrer two-parameter model from 1965."
                            scientific={true}
                          >
                            CP: {criticalPower.criticalPower}W | W': {(criticalPower.wPrime/1000).toFixed(1)}kJ
                          </Tooltip>
                        </div>
                        <div className="text-xs text-purple-500">
                          <Tooltip 
                            content="R² (R-squared) shows how well the mathematical model fits your power data. Values above 0.85 indicate excellent model accuracy."
                            scientific={true}
                          >
                            R² = {criticalPower.rSquared.toFixed(3)} (model fit)
                          </Tooltip>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{insight.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            <Tooltip 
                              content={insight.tooltip}
                              scientific={insight.scientific}
                            >
                              {insight.title}
                            </Tooltip>
                          </h4>
                          {insight.scientific && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Research-Based</span>
                          )}
                        </div>
                        <p className="text-gray-700 text-sm mb-1">{insight.description}</p>
                        <p className="text-gray-600 text-xs mb-2">{insight.details}</p>
                        <p className="text-blue-600 text-sm font-medium">{insight.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              <Tooltip 
                content="Objective training focus areas based on power data analysis and exercise physiology research. Shows mathematical opportunities without subjective interpretation."
                scientific={true}
              >
                Objective Training Focus Areas
              </Tooltip>
            </h3>
            <div className="space-y-4">
              {trainingFocus.map((focus, index) => (
                <div key={index} className={`border-l-4 ${
                  parseFloat(focus.improvementPotential || '0') > 20 ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                } p-4 rounded-r-lg`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{focus.duration}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        parseFloat(focus.improvementPotential || '0') > 20 ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                      }`}>
                        {focus.improvementPotential} potential
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {focus.frequency}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-gray-700 text-sm mb-2">
                        <strong>System:</strong> {focus.system}
                      </p>
                      <p className="text-gray-700 text-sm">
                        <strong>Current metric:</strong> {focus.currentDecay || focus.currentRatio || focus.cpDiscrepancy || 'Analysis available'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 text-sm">
                        <strong>Research basis:</strong> {focus.researchBasis}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <strong className="text-gray-900">Training Methods:</strong>
                    <ul className="mt-1 space-y-1">
                      {focus.trainingMethods?.map((method, mIndex) => (
                        <li key={mIndex} className="text-sm text-gray-600 ml-4 font-mono">
                          • {method}
                        </li>
                      )) || [
                        <li key="default" className="text-sm text-gray-600 ml-4">
                          • Targeted interval training for {focus.duration}
                        </li>
                      ]}
                    </ul>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500">
                    <strong>Expected adaptations:</strong> {focus.expectedAdaptations?.join(', ') || 'Performance improvement'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'zones' && trainingZones && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              <Tooltip 
                content="The 7-zone training system developed by Dr. Andrew Coggan, based on percentage of Functional Threshold Power (FTP). Each zone targets specific physiological adaptations."
                scientific={true}
              >
                Coggan Power Training Zones
              </Tooltip>
            </h3>
            <div className="text-sm text-gray-600 mb-4">
              Based on 
              <Tooltip 
                content="Functional Threshold Power - the highest average power you can sustain for 1 hour. Used as the basis for calculating all training zones."
                scientific={true}
              >
                FTP: {ftp}W
              </Tooltip> | Methodology: Training and Racing with a Power Meter
            </div>
            <div className="space-y-3">
              {Object.entries(trainingZones).map(([zone, data]) => (
                <div key={zone} className="flex items-center justify-between p-4 rounded-lg border" 
                     style={{ backgroundColor: data.color + '20', borderColor: data.color + '40' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        Zone {zone.slice(-1)}: {data.name}
                      </span>
                      <span className="text-sm text-gray-600">({data.percent})</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{data.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-semibold">
                      {data.range[0]}W - {data.range[1] === 9999 ? '∞' : `${data.range[1]}W`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'physiology' && energySystems && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Training Focus Areas
            </h3>
            <div className="text-sm text-gray-600 mb-4">
              Your racing performance comes from three key energy systems. Here's how to train each one:
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {energySystems.phosphocreatine && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h4 className="font-semibold text-red-900 mb-2">
                    Sprint Power (0-15 seconds)
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-red-700">Your Peak:</span>
                      <span className="ml-2 font-bold">{energySystems.phosphocreatine.peakPower}W</span>
                    </div>
                    <div>
                      <span className="text-sm text-red-700">Racing Use:</span>
                      <span className="ml-2">Final sprints, attacks, bridging gaps</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-red-100 rounded">
                    <div className="text-xs font-semibold text-red-800 mb-2">Training Recipe:</div>
                    <ul className="text-xs text-red-700 space-y-1">
                      <li>• 8 × 15sec all-out sprints</li>
                      <li>• 3min recovery between</li>
                      <li>• 2-3 times per week</li>
                      <li>• Focus: explosive starts</li>
                    </ul>
                  </div>
                </div>
              )}

              {energySystems.glycolytic && (
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <h4 className="font-semibold text-orange-900 mb-2">
                    Attack Power (15sec-2min)
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-orange-700">Your Peak:</span>
                      <span className="ml-2 font-bold">{energySystems.glycolytic.peakPower}W</span>
                    </div>
                    <div>
                      <span className="text-sm text-orange-700">Racing Use:</span>
                      <span className="ml-2">Breakaways, climbs, sustained attacks</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-orange-100 rounded">
                    <div className="text-xs font-semibold text-orange-800 mb-2">Training Recipe:</div>
                    <ul className="text-xs text-orange-700 space-y-1">
                      <li>• 5 × 2min @ 110-120% FTP</li>
                      <li>• 3min recovery between</li>
                      <li>• 1-2 times per week</li>
                      <li>• Focus: sustained attacks</li>
                    </ul>
                  </div>
                </div>
              )}

              {energySystems.oxidative && (
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-semibold text-green-900 mb-2">
                    Endurance Power (2min+)
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-green-700">Your FTP:</span>
                      <span className="ml-2 font-bold">{energySystems.oxidative.peakPower}W</span>
                    </div>
                    <div>
                      <span className="text-sm text-green-700">Racing Use:</span>
                      <span className="ml-2">Long efforts, chasing groups, climbing</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-green-100 rounded">
                    <div className="text-xs font-semibold text-green-800 mb-2">Training Recipe:</div>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li>• 3-4 × 8min @ 95-105% FTP</li>
                      <li>• 4min recovery between</li>
                      <li>• 2 times per week</li>
                      <li>• Focus: sustained power</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                Racing Strategy Tips
              </h4>
              <div className="text-sm text-blue-700 space-y-2">
                <p><strong>In Breakaways:</strong> Use your attack power (15sec-2min) to get away, then switch to endurance power to stay away.</p>
                <p><strong>In Sprints:</strong> Time your sprint power (0-15sec) for the final 200-300 meters when others are fading.</p>
                <p><strong>On Climbs:</strong> Pace with endurance power, attack with your 15sec-2min power on steepest sections.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InsightsPanel
