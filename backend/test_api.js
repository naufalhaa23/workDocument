const jwt = require('jsonwebtoken');
require('dotenv').config();
const axios = require('axios');

async function runTest() {
  const payload = { id: 2, username: 'superadmin', role: 'superadmin' };
  const token = jwt.sign(payload, process.env.JWT_ACC_SECRET || 'secretacc', { expiresIn: '1d' });
  
  try {
      const res = await axios.put('http://localhost:5000/api/documents/1', {
          document_type: 'SP',
          document_number: 'TEST-123',
          document_date: new Date().toISOString(),
          title: 'Title',
          assignees: ['3', '4']
      }, {
          headers: { Authorization: 'Bearer ' + token }
      });
      console.log('PUT SUCCESS');
  } catch(e) {
      console.error('PUT ERROR:', e.response?.data || e.message);
  }
}
runTest();
