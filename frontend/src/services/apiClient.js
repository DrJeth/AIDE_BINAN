import axios from "axios";

// BASE URL
const DEFAULT_BASE = "http://192.168.0.102:4000"; // <-- replace IP if needed

// Axios instance
const apiClient = axios.create({
  baseURL: DEFAULT_BASE,
  timeout: 5000,
});

// TEST BACKEND
export async function testBackend() {
  try {
    const res = await apiClient.get("/");
    return res.data;
  } catch (e) {
    throw new Error("Backend unreachable: " + e.message);
  }
}


// ADMIN LOGIN (employee + password)
// Endpoint: POST /admin/login
export async function adminLogin(employeeId, password) {
  try {
    const res = await apiClient.post("/admin/login", {
      employeeId,
      password,
    });
    return res.data;
  } catch (e) {
    throw new Error("Admin login failed: " + e.message);
  }
}

//  RIDER LOGIN (username + password)
// Endpoint: POST /rider/login
export async function riderLogin(username, password) {
  try {
    const res = await apiClient.post("/rider/login", {
      username,
      password,
    });
    return res.data;
  } catch (e) {
    throw new Error("Rider login failed: " + e.message);
  }
}


// GET STATIC ITEMS  (GET /items)
export async function getItems() {
  try {
    const res = await apiClient.get("/items");
    return res.data;
  } catch (e) {
    throw new Error("Failed to fetch items: " + e.message);
  }
}

//  ADD FIRESTORE ITEM (POST /add-item)
export async function addItem(data) {
  try {
    const res = await apiClient.post("/add-item", data);
    return res.data;
  } catch (e) {
    throw new Error("Failed to add item: " + e.message);
  }
}

// I'll add details and update this pa
export default {
  testBackend,
  adminLogin,
  riderLogin,
  getItems,
  addItem,
  apiClient,
  BASE_URL: DEFAULT_BASE,
};
