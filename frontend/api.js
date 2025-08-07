import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const triggerTrade = async () => {
  const res = await axios.post(`${API_URL}/trade`);
  return res.data;
};
