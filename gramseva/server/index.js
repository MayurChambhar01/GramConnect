const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors({ origin: ['http://localhost:5173','http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/families',      require('./routes/families'));
app.use('/api/complaints',    require('./routes/complaints'));
app.use('/api/certificates',  require('./routes/certificates'));
app.use('/api/cert-pdf',      require('./routes/_combined').certPdf);
app.use('/api/taxes',         require('./routes/taxes'));
app.use('/api/sos',           require('./routes/sos'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/documents',     require('./routes/documents'));
app.use('/api/schemes/check', require('./routes/schemes_check'));  // ← BEFORE /schemes
app.use('/api/schemes',       require('./routes/schemes'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/gram-sabha',    require('./routes/gramSabha'));
app.use('/api/chatbot',       require('./routes/chatbot'));
app.use('/api/ai',            require('./routes/ai'));
app.use('/api/voting',        require('./routes/voting'));
app.use('/api/assets',        require('./routes/assets'));
app.use('/api/marketplace',   require('./routes/marketplace'));

app.get('/api/health', (req, res) => res.json({ status: 'GramSeva API running ✓', time: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gramseva')
  .then(() => { console.log('✅ MongoDB connected'); app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`)); })
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });
