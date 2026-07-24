import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { RequestAccess } from "./pages/RequestAccess";
import { DashboardSalesWarehouseLogistics } from "./pages/DashboardSalesWarehouseLogistics";
import { DashboardFinance } from "./pages/DashboardFinance";
import { UserManagementList } from "./pages/users/UserManagementList";
import { AddUser } from "./pages/users/AddUser";
import { ChangeRole } from "./pages/users/ChangeRole";
import { CompanyLogo } from "./pages/users/CompanyLogo";
import { ComingSoon } from "./pages/ComingSoon";
import { NAV } from "./nav";

function App() {
  const notYetBuiltPaths = NAV.flatMap((g) => g.items).filter((i) => !i.implemented);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/request-access" element={<RequestAccess />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard/sales-warehouse-logistics" replace />} />
        <Route
          path="/dashboard/sales-warehouse-logistics"
          element={
            <ProtectedRoute permission="dashboard.view">
              <DashboardSalesWarehouseLogistics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/finance"
          element={
            <ProtectedRoute permission="finance.dashboard.view">
              <DashboardFinance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute permission="user.userManagement.manage">
              <UserManagementList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <ProtectedRoute permission="user.userManagement.manage">
              <AddUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/logo"
          element={
            <ProtectedRoute permission="user.userManagement.manage">
              <CompanyLogo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id/role"
          element={
            <ProtectedRoute permission="user.userManagement.manage">
              <ChangeRole />
            </ProtectedRoute>
          }
        />

        {notYetBuiltPaths.map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={
              <ProtectedRoute permission={item.permission}>
                <ComingSoon />
              </ProtectedRoute>
            }
          />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
