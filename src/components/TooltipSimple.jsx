import React from 'react'

const TooltipSimple = ({ content, children, disabled = false, scientific = false }) => {
  if (disabled) {
    return children
  }

  const tooltipContent = typeof content === 'string' ? content : 'Tooltip information'
  
  return (
    <span 
      title={tooltipContent}
      className={`${scientific ? 'cursor-help underline decoration-dotted decoration-blue-500' : ''}`}
    >
      {children}
    </span>
  )
}

export default TooltipSimple
