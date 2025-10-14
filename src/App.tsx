import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import Login from "./routes/login";
import Sales from "./routes/sales";
import AdminLayout from "./layouts/adminLayout";
import Admin from "./routes/admin";
import Admins from "./routes/admin/admins";
import SalesPage from "./routes/admin/sales";
import Tracking from "./routes/admin/tracking";
import Reports from "./routes/admin/reports";
import Assignments from "./routes/admin/assignments";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/sales",
    element: <Sales />,
  },
  {
    path: "/admin",
    element: (
      <AdminLayout>
        <Admin />
      </AdminLayout>
    ),
  },
  {
    path: "/admin/admins",
    element: (
      <AdminLayout>
        <Admins />
      </AdminLayout>
    ),
  },
  {
    path: "/admin/sales",
    element: (
      <AdminLayout>
        <SalesPage />
      </AdminLayout>
    ),
  },
  {
    path: "/admin/tracking",
    element: (
      <AdminLayout>
        <Tracking />
      </AdminLayout>
    ),
  },
  {
    path: "/admin/reports",
    element: (
      <AdminLayout>
        <Reports />
      </AdminLayout>
    ),
  },
  {
    path: "/admin/tracking/:id",
    element: <Assignments />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
