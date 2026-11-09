/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import POSPage from './pages/pos/POSPage';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import MenuPage from './pages/admin/MenuPage';
import RecipePage from './pages/admin/RecipePage';
import InventoryPage from './pages/admin/InventoryPage';
import PurchaseOrderPage from './pages/admin/PurchaseOrderPage';
import OrdersPage from './pages/admin/OrdersPage';
import OnlineOrderingPage from './pages/admin/OnlineOrderingPage';
import ShiftPage from './pages/admin/ShiftPage';
import KDSPage from './pages/kds/KDSPage';
import CRMPage from './pages/admin/CRMPage';
import ReportsPage from './pages/admin/ReportsPage';
import SettingsPage from './pages/admin/SettingsPage';
import WebstorePage from './pages/webstore/WebstorePage';
import ChatbotPage from './pages/webstore/ChatbotPage';
import AuthGuard from './components/AuthGuard';
import { ToastProvider } from './components/Toast';

import StaffPage from './pages/admin/StaffPage';
import HardwarePage from './pages/admin/HardwarePage';
import SuperAdminPage from './pages/admin/SuperAdminPage';
import TableSetupPage from './pages/admin/TableSetupPage';
import DatabaseDiagnosticsPage from './pages/admin/DatabaseDiagnosticsPage';
import SystemFlowPage from './pages/admin/SystemFlowPage';
import StocktakePage from './pages/admin/StocktakePage';
import MenuAnalysisPage from './pages/admin/MenuAnalysisPage';
import ProfitLossPage from './pages/admin/ProfitLossPage';
import BookingsPage from './pages/admin/BookingsPage';
import StorefrontLayout from './storefront/StorefrontLayout';
import HomePage from './storefront/HomePage';
import StorefrontMenuPage from './storefront/MenuPage';
import ContactPage from './storefront/ContactPage';
import { PrivacyPage, DataDeletionPage } from './storefront/PolicyPages';
import BlogPage from './storefront/BlogPage';
import BlogPostPage from './storefront/BlogPostPage';
import BlogAdminPage from './pages/admin/BlogAdminPage';
import BlogEditorPage from './pages/admin/BlogEditorPage';
import ScrollToTop from './storefront/ScrollToTop';

export default function App() {
  return (
    <ToastProvider>
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<StorefrontLayout />}>
          <Route index element={<HomePage />} />
          <Route path="order" element={<StorefrontMenuPage />} />
          <Route path="menu" element={<Navigate to="/order" replace />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="data-deletion" element={<DataDeletionPage />} />
        </Route>
        <Route path="/store" element={<WebstorePage />} />
        <Route path="/bot" element={<ChatbotPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pos" element={<AuthGuard><POSPage /></AuthGuard>} />
        <Route path="/kds" element={<AuthGuard roles={['kitchen', 'admin', 'manager']}><KDSPage /></AuthGuard>} />
        
        <Route path="/admin" element={<AuthGuard roles={['admin', 'manager']}><AdminLayout /></AuthGuard>}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="online-ordering" element={<OnlineOrderingPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="blog" element={<BlogAdminPage />} />
          <Route path="blog/new" element={<BlogEditorPage />} />
          <Route path="blog/edit/:id" element={<BlogEditorPage />} />
          <Route path="shifts" element={<ShiftPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="recipe" element={<RecipePage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="purchasing" element={<PurchaseOrderPage />} />
          <Route path="crm" element={<CRMPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="hardware" element={<HardwarePage />} />
          <Route path="super" element={<SuperAdminPage />} />
          <Route path="tables" element={<TableSetupPage />} />
          <Route path="flow" element={<SystemFlowPage />} />
          <Route path="diagnostics" element={<DatabaseDiagnosticsPage />} />
          <Route path="stocktake" element={<StocktakePage />} />
          <Route path="menu-analysis" element={<MenuAnalysisPage />} />
          <Route path="profit-loss" element={<ProfitLossPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}
