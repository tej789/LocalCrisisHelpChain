import axios from "axios";
console.log("API URL:", process.env.REACT_APP_API_URL);
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});
// const api = axios.create({
//   baseURL: "http://localhost:5000"
// });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor: handle 401 Unauthorized globally
api.interceptors.response.use(
  response => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Clear stored auth and force user to login again
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch (e) {}
      // optional: preserve reason for login page
      window.location.href = '/login?reason=expired';
    }
    return Promise.reject(error);
  }
);

export default api;
