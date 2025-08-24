import React, { useState, useEffect } from 'react'
import { PerformanceIntelligence } from '../utils/performanceIntelligence'
import TooltipSimple from './TooltipSimple'

/**
 * Personalized Workout Generator
 * 
 * Creates scientifically-based, personalized workouts that target the rider's
 * specific weaknesses and development opportunities.
 * 
 * Philosophy: "Tell me exactly what to do in my next training session"
 */
const PersonalizedWorkouts = ({ riderData, focusArea }) => {
  const [workouts, setWorkouts] = useState([])
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [trainingPhase, setTrainingPhase] = useState('build')

  useEffect(() => {
    if (riderData && focusArea) {
      const generatedWorkouts = PerformanceIntelligence.generatePersonalizedWorkouts(
        riderData, 
        focusArea, 
        trainingPhase
      )
      setWorkouts(generatedWorkouts)
      setSelectedWorkout(generatedWorkouts[0] || null)
    }
  }, [riderData, focusArea, trainingPhase])

  if (!focusArea || workouts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">💪</div>
          <h3 className="text-lg font-semibold mb-2">Personalized Workouts</h3>
          <p>Select a focus area to generate personalized training sessions</p>
        </div>
      </div>
    )
  }

  const ftp = riderData.ftp || 250

  // Get workout intensity styling
  const getIntensityColor = (intensity) => {
    if (intensity.includes('All-out') || intensity.includes('Maximum')) return 'text-red-600 font-bold'
    if (intensity.includes('115%') || intensity.includes('110%')) return 'text-orange-600 font-semibold'
    if (intensity.includes('105%') || intensity.includes('100%')) return 'text-yellow-600 font-medium'
    if (intensity.includes('95%') || intensity.includes('90%')) return 'text-green-600 font-medium'
    return 'text-blue-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-2 flex items-center">
          <span className="mr-2">💪</span>
          Personalized Training for {focusArea.area}
        </h2>
        <p className="text-blue-700 mb-4">
          {focusArea.description} - targeting {focusArea.system} development
        </p>
        
        {/* Training Phase Selector */}
        <div className="flex space-x-2">
          {['base', 'build', 'peak', 'recovery'].map((phase) => (
            <button
              key={phase}
              onClick={() => setTrainingPhase(phase)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                trainingPhase === phase
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-blue-600 hover:bg-blue-50'
              }`}
            >
              {phase.charAt(0).toUpperCase() + phase.slice(1)} Phase
            </button>
          ))}
        </div>
      </div>

      {/* Workout Selection */}
      {workouts.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Available Workouts</h3>
          <div className="flex space-x-2">
            {workouts.map((workout, index) => (
              <button
                key={index}
                onClick={() => setSelectedWorkout(workout)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  selectedWorkout === workout
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {workout.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Workout Detail */}
      {selectedWorkout && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Workout Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{selectedWorkout.name}</h3>
              <div className="flex items-center space-x-4">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  {selectedWorkout.type}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  {selectedWorkout.duration}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Training Schedule</h4>
                <p className="text-sm text-gray-600">
                  <strong>Frequency:</strong> {selectedWorkout.frequency}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Progression:</strong> {selectedWorkout.progression}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">
                  <TooltipSimple 
                    content="The specific physiological adaptations this workout targets, based on exercise science research."
                    scientific={true}
                  >
                    Target Adaptations
                  </TooltipSimple>
                </h4>
                <ul className="text-sm text-gray-600">
                  {selectedWorkout.targetAdaptations.map((adaptation, index) => (
                    <li key={index}>• {adaptation}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Workout Structure */}
          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Workout Structure</h4>
            
            <div className="space-y-3">
              {selectedWorkout.structure.map((phase, index) => (
                <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-shrink-0 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-600 font-bold text-lg">{index + 1}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-semibold text-gray-900">{phase.phase}</h5>
                      <span className="text-sm font-medium text-gray-600">{phase.duration}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <span className={`text-sm font-medium ${getIntensityColor(phase.intensity)}`}>
                        {phase.intensity}
                      </span>
                      {phase.intensity.includes('W') && (
                        <TooltipSimple 
                          content="Target power output based on your current FTP. Adjust by ±5-10W based on how you feel."
                        >
                          <span className="text-xs text-gray-500">
                            (Based on FTP: {ftp}W)
                          </span>
                        </TooltipSimple>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600">{phase.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Tips */}
          <div className="p-6 bg-blue-50 border-t border-gray-200">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
              <span className="mr-2">💡</span>
              Execution Tips
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-semibold text-blue-800 mb-2">Before You Start:</h5>
                <ul className="text-blue-700 space-y-1">
                  <li>• Ensure 2-3 hour gap since last meal</li>
                  <li>• Start well-hydrated</li>
                  <li>• Set up power/heart rate zones</li>
                  <li>• Have recovery drink ready</li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-semibold text-blue-800 mb-2">During Workout:</h5>
                <ul className="text-blue-700 space-y-1">
                  <li>• Focus on smooth, consistent power</li>
                  <li>• Take recovery intervals seriously</li>
                  <li>• Adjust intensity if feeling unwell</li>
                  <li>• Stay mentally engaged throughout</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-100 rounded border border-blue-200">
              <p className="text-blue-800 text-sm">
                <strong>Recovery:</strong> Allow 24-48 hours easy/rest after this session. 
                Next similar workout should be in 3-4 days with adequate recovery between.
              </p>
            </div>
          </div>

          {/* Scientific Background */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="mr-2">🔬</span>
              <TooltipSimple 
                content="The exercise science research that supports this workout design and its expected adaptations."
                scientific={true}
              >
                Scientific Rationale
              </TooltipSimple>
            </h4>
            
            <div className="text-sm text-gray-700 space-y-2">
              {focusArea.area === 'Sprint Power' && (
                <div>
                  <p className="mb-2">
                    <strong>Phosphocreatine System Development:</strong> Short, maximal efforts with full recovery 
                    target the PCr energy system responsible for explosive power.
                  </p>
                  <p>
                    <strong>Research:</strong> Dawson et al. (1998) showed that 15-second maximal efforts with 
                    5-minute recovery optimize PCr resynthesis and power gains.
                  </p>
                </div>
              )}
              
              {focusArea.area === 'Attack Power' && (
                <div>
                  <p className="mb-2">
                    <strong>VO2max and Anaerobic Development:</strong> Intervals at 110-120% FTP stress both 
                    aerobic and anaerobic energy systems simultaneously.
                  </p>
                  <p>
                    <strong>Research:</strong> Laursen & Jenkins (2002) demonstrated that 3-5 minute intervals 
                    at this intensity optimize VO2max gains and anaerobic capacity.
                  </p>
                </div>
              )}
              
              {focusArea.area === 'Threshold Power' && (
                <div>
                  <p className="mb-2">
                    <strong>Sweet Spot Training:</strong> 88-93% FTP targets the optimal intensity for 
                    mitochondrial adaptations and FTP improvement.
                  </p>
                  <p>
                    <strong>Research:</strong> Coggan & Allen (2019) showed sweet spot training produces 
                    superior FTP gains compared to traditional threshold intervals.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PersonalizedWorkouts
