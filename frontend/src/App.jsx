import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CityProvider } from './context/CityContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ActionPlanPage from './pages/ActionPlanPage';
import DataExplorerPage from './pages/DataExplorerPage';
import AboutPage from './pages/AboutPage';
import GreenGapPage from './pages/GreenGapPage';
import ResearchPage from './pages/ResearchPage';
import CityRankingPage from './pages/CityRankingPage';
import ModelEvaluationPage from './pages/ModelEvaluationPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <CityProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/action-plan" element={<ProtectedRoute><ActionPlanPage /></ProtectedRoute>} />
          <Route path="/data-explorer" element={<ProtectedRoute><DataExplorerPage /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
          <Route path="/green-gap" element={<ProtectedRoute><GreenGapPage /></ProtectedRoute>} />
          <Route path="/research" element={<ProtectedRoute><ResearchPage /></ProtectedRoute>} />
          <Route path="/rankings" element={<ProtectedRoute><CityRankingPage /></ProtectedRoute>} />
          <Route path="/models" element={<ProtectedRoute><ModelEvaluationPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </CityProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
