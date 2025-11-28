// utils/patterns.ts or lib/patterns.ts

export const getPatternSVG = (pattern: string, color: string): string => {
  // Create a lighter version of the color for patterns
  const lighterColor = adjustColorOpacity(color, 0.15);
  
  switch (pattern) {
    case 'dots':
      return `
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="2" fill="${lighterColor}"/>
        </svg>
      `;
    
    case 'grid':
      return `
        <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${lighterColor}" stroke-width="1"/>
        </svg>
      `;
    
    case 'diagonal':
      return `
        <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 40L40 0M-10 10L10 -10M30 50L50 30" stroke="${lighterColor}" stroke-width="2"/>
        </svg>
      `;
    
    case 'waves':
      return `
        <svg width="60" height="30" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 15 Q15 5, 30 15 T60 15" fill="none" stroke="${lighterColor}" stroke-width="2"/>
        </svg>
      `;
    
    case 'circles':
      return `
        <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
          <circle cx="30" cy="30" r="20" fill="none" stroke="${lighterColor}" stroke-width="2"/>
        </svg>
      `;
    
    default:
      return '';
  }
};

// Helper to adjust color opacity
const adjustColorOpacity = (hex: string, opacity: number): string => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Alternative: Return inline style for background
export const getPatternStyle = (pattern: string, color: string): React.CSSProperties => {
  if (pattern === 'none') {
    return { backgroundColor: color };
  }
  
  const patternSVG = getPatternSVG(pattern, color);
  const encodedSVG = encodeURIComponent(patternSVG);
  
  return {
    backgroundColor: color,
    backgroundImage: `url("data:image/svg+xml,${encodedSVG}")`,
    backgroundRepeat: 'repeat',
  };
};