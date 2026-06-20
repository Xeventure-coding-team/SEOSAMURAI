import React, { ReactNode } from 'react';
import '../main.css';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const MarketingLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div>
       {children}
    </div>
  );
};

export default MarketingLayout;