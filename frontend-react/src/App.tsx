import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import VoiceAssistant from './components/VoiceAssistant';

const GlobalStyle = createGlobalStyle`
  :root {
    --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    --accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    --success-gradient: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    --warning-gradient: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    
    --bg-primary: #0a0a0f;
    --bg-secondary: #1a1a2e;
    --bg-tertiary: #16213e;
    --bg-card: rgba(26, 26, 46, 0.8);
    --bg-modal: rgba(22, 33, 62, 0.95);
    
    --text-primary: #ffffff;
    --text-secondary: #a8a8b3;
    --text-muted: #6b7280;
    
    --border-light: rgba(255, 255, 255, 0.1);
    --border-medium: rgba(255, 255, 255, 0.2);
    
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.15);
    --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.25);
    --shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.35);
    
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3) 0%, transparent 50%);
    pointer-events: none;
    z-index: -1;
  }
`;

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
`;

const App: React.FC = () => {
  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <VoiceAssistant />
      </AppContainer>
    </>
  );
};

export default App;
