import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/pages/Dashboard";
import { Budget } from "./components/pages/Budget";
import { Savings } from "./components/pages/Savings";
import { Wallet } from "./components/pages/Wallet";
import { Account } from "./components/pages/Account";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "budget", element: <Budget /> },
      { path: "savings", element: <Savings /> },
      { path: "wallet", element: <Wallet /> },
      { path: "account", element: <Account /> },
    ],
  },
]);