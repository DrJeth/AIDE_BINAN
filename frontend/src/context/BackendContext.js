import { createContext, useState } from "react";
import api from "../services/apiClient";

export const BackendContext = createContext();

export function BackendProvider({ children }) {
  const [user, setUser] = useState(null);  
  const [loading, setLoading] = useState(false);

  // -------------------------
  // ADMIN LOGIN
  // -------------------------
  async function loginAdmin(employeeNumber, password) {
    setLoading(true);
    try {
      const res = await api.post("/admin/login", {
        employeeNumber,
        password
      });
      setUser(res.data);
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data };
    } finally {
      setLoading(false);
    }
  }

  // -------------------------
  // RIDER LOGIN
  // -------------------------
  async function loginRider(email, password) {
    setLoading(true);
    try {
      const res = await api.post("/rider/login", {
        email,
        password
      });
      setUser(res.data);
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data };
    } finally {
      setLoading(false);
    }
  }

  // -------------------------
  // ADMIN REGISTRATION
  // -------------------------
  async function registerAdmin(data) {
    return api.post("/admin/register", data);
  }

  // -------------------------
  // RIDER REGISTRATION
  // -------------------------
  async function registerRider(data) {
    return api.post("/rider/register", data);
  }

  // -------------------------
  // EXAMPLE: FETCH ORDERS
  // -------------------------
  async function getOrders() {
    return api.get("/orders");
  }

  return (
    <BackendContext.Provider
      value={{
        user,
        loading,
        loginAdmin,
        loginRider,
        registerAdmin,
        registerRider,
        getOrders
      }}
    >
      {children}
    </BackendContext.Provider>
  );
}
