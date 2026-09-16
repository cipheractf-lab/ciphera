import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { initSecurity } from './utils/security'
import './App.css'
import './enable-copy.css'

// Context
import { AuthProvider } from './context/AuthContext'
import { SiteConfigProvider } from './context/SiteConfigContext'

// Components (loaded immediately - they're used on every page)
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import BackToTopButton from './components/BackToTopButton'

import { Loading } from './components/ui';

const PageLoader = () => <Loading text="INITIALIZING..." />;

// Lazy load pages - only load when needed
const Home = lazy(() => import('./pages/Home.tsx'))
const Challenges = lazy(() => import('./pages/Challenges'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Profile = lazy(() => import('./pages/Profile'))
const Scoreboard = lazy(() => import('./pages/CyberScoreboard'))
const CreateChallenge = lazy(() => import('./pages/CreateChallenge'))
const EditChallenge = lazy(() => import('./pages/EditChallenge'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminCreateUser = lazy(() => import('./pages/AdminCreateUser'))
const AdminCreateTeam = lazy(() => import('./pages/AdminCreateTeam'))
const TeamDetails = lazy(() => import('./pages/TeamDetails'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const AdminUserProfile = lazy(() => import('./pages/AdminUserProfile'))
const ContactUs = lazy(() => import('./pages/ContactUs'))
const AdminContactMessages = lazy(() => import('./pages/AdminContactMessages'))
const AdminLoginLogs = lazy(() => import('./pages/AdminLoginLogs'))
const PlatformReset = lazy(() => import('./pages/PlatformReset'))
const UserBlocked = lazy(() => import('./pages/UserBlocked'))
const ChallengeDetails = lazy(() => import('./pages/ChallengeDetails'))
const Notice = lazy(() => import('./pages/Notice'))
const AdminStatistics = lazy(() => import('./pages/AdminStatistics'))
const AdminSubmissions = lazy(() => import('./pages/AdminSubmissions'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const AdminLiveMonitor = lazy(() => import('./pages/AdminLiveMonitor'))
const MyTeam = lazy(() => import('./pages/MyTeam'))
const AdminCategories = lazy(() => import('./pages/AdminCategories'))
const AdminEventControl = lazy(() => import('./pages/AdminEventControl'))
const AdminConfiguration = lazy(() => import('./pages/AdminConfiguration'))
const EventStatus = lazy(() => import('./pages/EventStatus'))

function AppShell() {
  const location = useLocation()
  const isHomeRoute = location.pathname === '/'
  const isChallengesRoute = location.pathname === '/challenges'
  const isChallengeDetailRoute = location.pathname.startsWith('/challenges/')
  const isScoreboardRoute = location.pathname === '/scoreboard'
  const isProfileRoute = location.pathname === '/profile'
  const isTeamDetailsRoute = location.pathname.startsWith('/team/') || location.pathname.startsWith('/teams/')
  const isUserProfileRoute = location.pathname.startsWith('/user/') || location.pathname.startsWith('/users/')
  const isContactRoute = location.pathname === '/contact'
  const isNoticesRoute = location.pathname === '/notices'
  const isAdminConfigurationRoute = location.pathname === '/admin/configuration'
  const isAdminDashboardRoute = location.pathname === '/admin'
  const isAdminStatisticsRoute = location.pathname === '/admin/statistics'
  const isAdminSubmissionsRoute = location.pathname === '/admin/submissions'
  const isAdminCategoriesRoute = location.pathname === '/admin/categories'
  const isAdminLiveMonitorRoute = location.pathname === '/admin/live-monitor'
  const isAdminLoginLogsRoute = location.pathname === '/admin/login-logs'
  const isAdminMessagesRoute = location.pathname === '/admin/messages'
  const isAdminEventControlRoute = location.pathname === '/admin/event-control'
  const isAdminCreateUserRoute = location.pathname === '/admin/create-user'
  const isAdminCreateTeamRoute = location.pathname === '/admin/create-team'
  const isLoginRoute = location.pathname === '/login'

  return (
    <div className="app-container">
      <Navbar />
      <main className={`main-content${isHomeRoute ? ' main-content--home' : ''}${isChallengesRoute ? ' main-content--challenges' : ''}${isChallengeDetailRoute ? ' main-content--challenge-detail' : ''}${isScoreboardRoute ? ' main-content--scoreboard' : ''}${isProfileRoute ? ' main-content--profile' : ''}${isTeamDetailsRoute ? ' main-content--team-details' : ''}${isUserProfileRoute ? ' main-content--user-profile' : ''}${isContactRoute ? ' main-content--contact' : ''}${isNoticesRoute ? ' main-content--notices' : ''}${isLoginRoute ? ' main-content--login' : ''}${isAdminConfigurationRoute ? ' main-content--admin-configuration' : ''}${isAdminDashboardRoute ? ' main-content--admin-dashboard' : ''}${isAdminStatisticsRoute ? ' main-content--admin-statistics' : ''}${isAdminSubmissionsRoute ? ' main-content--admin-submissions' : ''}${isAdminCategoriesRoute ? ' main-content--admin-categories' : ''}${isAdminLiveMonitorRoute ? ' main-content--admin-live-monitor' : ''}${isAdminLoginLogsRoute ? ' main-content--admin-login-logs' : ''}${isAdminMessagesRoute ? ' main-content--admin-messages' : ''}${isAdminEventControlRoute ? ' main-content--admin-event-control' : ''}${isAdminCreateUserRoute ? ' main-content--admin-create-user' : ''}${isAdminCreateTeamRoute ? ' main-content--admin-create-team' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/challenges" element={
              <ProtectedRoute>
                <Challenges />
              </ProtectedRoute>
            } />
            <Route path="/challenges/:id" element={
              <ProtectedRoute>
                <ChallengeDetails />
              </ProtectedRoute>
            } />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/notices" element={<Notice />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/scoreboard" element={
              <ProtectedRoute>
                <Scoreboard />
              </ProtectedRoute>
            } />
            <Route path="/event-status" element={<EventStatus />} />
            <Route path="/team/:id" element={
              <ProtectedRoute>
                <TeamDetails />
              </ProtectedRoute>
            } />
            <Route path="/teams/:id" element={
              <ProtectedRoute>
                <TeamDetails />
              </ProtectedRoute>
            } />

            <Route path="/my-team" element={
              <ProtectedRoute>
                <MyTeam />
              </ProtectedRoute>
            } />

            <Route path="/user/:userId" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            <Route path="/users/:userId" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            <Route path="/create-challenge" element={
              <ProtectedRoute adminOnly={true}>
                <CreateChallenge />
              </ProtectedRoute>
            } />
            <Route path="/edit-challenge/:id" element={
              <ProtectedRoute adminOnly={true}>
                <EditChallenge />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/create-user" element={
              <ProtectedRoute adminOnly={true}>
                <AdminCreateUser />
              </ProtectedRoute>
            } />
            <Route path="/admin/create-team" element={
              <ProtectedRoute adminOnly={true}>
                <AdminCreateTeam />
              </ProtectedRoute>
            } />
            <Route path="/admin/messages" element={
              <ProtectedRoute adminOnly={true}>
                <AdminContactMessages />
              </ProtectedRoute>
            } />
            <Route path="/admin/login-logs" element={
              <ProtectedRoute adminOnly={true}>
                <AdminLoginLogs />
              </ProtectedRoute>
            } />
            <Route path="/admin/users/:id" element={
              <ProtectedRoute adminOnly={true}>
                <AdminUserProfile />
              </ProtectedRoute>
            } />
            <Route path="/admin/platform-reset" element={
              <ProtectedRoute adminOnly={true}>
                <PlatformReset />
              </ProtectedRoute>
            } />
            <Route path="/admin/statistics" element={
              <ProtectedRoute adminOnly={true}>
                <AdminStatistics />
              </ProtectedRoute>
            } />
            <Route path="/admin/submissions" element={
              <ProtectedRoute adminOnly={true}>
                <AdminSubmissions />
              </ProtectedRoute>
            } />
            <Route path="/admin/categories" element={
              <ProtectedRoute adminOnly={true}>
                <AdminCategories />
              </ProtectedRoute>
            } />
            <Route path="/admin/live-monitor" element={
              <ProtectedRoute adminOnly={true}>
                <AdminLiveMonitor />
              </ProtectedRoute>
            } />
            <Route path="/admin/event-control" element={
              <ProtectedRoute adminOnly={true}>
                <AdminEventControl />
              </ProtectedRoute>
            } />
            <Route path="/admin/configuration" element={
              <ProtectedRoute adminOnly={true}>
                <AdminConfiguration />
              </ProtectedRoute>
            } />
            <Route path="/admin/event-status" element={
              <ProtectedRoute adminOnly={true}>
                <AdminEventControl />
              </ProtectedRoute>
            } />
            <Route path="/blocked" element={<UserBlocked />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <BackToTopButton />
    </div>
  )
}

function App() {
  useEffect(() => {
    initSecurity();

    // Force enable right-click and text selection
    document.addEventListener('DOMContentLoaded', () => {
      // Remove any existing event listeners that prevent right-click
      document.oncontextmenu = null;
      document.onselectstart = null;
      document.ondragstart = null;

      // Enable text selection on all elements
      const style = document.createElement('style');
      style.textContent = `
        * {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
      `;
      document.head.appendChild(style);
    });

    // Also run immediately
    document.oncontextmenu = null;
    document.onselectstart = null;
    document.ondragstart = null;
  }, []);

  return (
    <AuthProvider>
      <SiteConfigProvider>
        <Router>
          <ScrollToTop />
          <AppShell />
        </Router>
      </SiteConfigProvider>
    </AuthProvider>
  )
}

export default App
