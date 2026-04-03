const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In Vercel Services, this service is mounted at /api, so routes here omit that prefix.
app.use('/auth', require('./routes/auth'));
app.use('/families', require('./routes/families'));
app.use('/complaints', require('./routes/complaints'));
app.use('/certificates', require('./routes/certificates'));
app.use('/cert-pdf', require('./routes/_combined').certPdf);
app.use('/taxes', require('./routes/taxes'));
app.use('/sos', require('./routes/sos'));
app.use('/notifications', require('./routes/notifications'));
app.use('/admin', require('./routes/admin'));
app.use('/documents', require('./routes/documents'));
app.use('/schemes/check', require('./routes/schemes_check'));
app.use('/schemes', require('./routes/schemes'));
app.use('/payments', require('./routes/payments'));
app.use('/gram-sabha', require('./routes/gramSabha'));
app.use('/chatbot', require('./routes/chatbot'));
app.use('/ai', require('./routes/ai'));
app.use('/voting', require('./routes/voting'));
app.use('/assets', require('./routes/assets'));
app.use('/marketplace', require('./routes/marketplace'));

app.get('/health', (req, res) => res.json({ status: 'GramSeva API running', time: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gramseva')
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  });
