import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
if(!API_URL) throw new Error("API_URL is not defined");
console.log("baseURL",API_URL);
export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export const verifyCleanup = async (reportId, file, lat, lng, token) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("lat", lat);
  formData.append("lng", lng);

  
  const response = await fetch(`${API_URL}/api/garbage/${reportId}/verify-cleanup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
};