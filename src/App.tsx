import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import MapView from "./pages/MapView";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AddProperty from "./pages/AddProperty";
import MyProperties from "./pages/MyProperties";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProperties from "./pages/admin/AdminProperties";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminVerifications from "./pages/admin/AdminVerifications";
import Favorites from "./pages/Favorites";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Rules from "./pages/Rules";
import Contact from "./pages/Contact";
import Compare from "./pages/Compare";
import AdminComplaints from "./pages/admin/AdminComplaints";
import AdminSettings from "./pages/admin/AdminSettings";
import RentCalculator from "./pages/RentCalculator";
import Chatbot from "./components/chat/Chatbot";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import MobileBottomNav from "./components/layout/MobileBottomNav";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: Error) => {
      console.error('Query Error:', error);
      toast.error(`Data fetch error: ${error.message || 'Something went wrong'}`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: Error) => {
      console.error('Mutation Error:', error);
      toast.error(`Action failed: ${error.message || 'Could not complete the request'}`);
    },
  }),
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-property"
              element={
                <ProtectedRoute requiredRoles={['owner', 'admin', 'subadmin']}>
                  <AddProperty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/properties"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminProperties />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminVerifications />
                </ProtectedRoute>
              }
            />
            {/* Additional Routes */}
            <Route path="/compare" element={<Compare />} />
            <Route path="/rent-calculator" element={<RentCalculator />} />
            <Route
              path="/my-properties"
              element={
                <ProtectedRoute requiredRoles={['owner', 'admin', 'subadmin']}>
                  <MyProperties />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/list-property" element={<AddProperty />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/payment/:propertyId"
              element={
                <ProtectedRoute requiredRoles={['owner', 'admin', 'subadmin']}>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/success"
              element={
                <ProtectedRoute requiredRoles={['owner', 'admin', 'subadmin']}>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
          <MobileBottomNav />
          <Chatbot />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
