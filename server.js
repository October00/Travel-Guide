const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// 启用CORS
app.use(cors());

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// API路由，用于获取地图密钥
app.get('/api/map-key', (req, res) => {
  console.log('Processing API key request');
  console.log('Environment variable value:', process.env.AMAP_MAPS_API_KEY ? 'Loaded' : 'Not loaded');
  const responseData = { key: process.env.AMAP_MAPS_API_KEY };
  console.log('Sending response:', JSON.stringify(responseData));
  res.json(responseData);
});

// 静态文件服务日志
const staticMiddleware = express.static(path.join(__dirname));
app.use((req, res, next) => {
  console.log('Trying static file:', req.path);
  staticMiddleware(req, res, (err) => {
    if (err) {
      console.log('Static file not found:', req.path);
      next();
    } else {
      console.log('Served static file:', req.path);
    }
  });
});

// 404处理中间件
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.path);
  res.status(404).json({ error: 'Not found', path: req.path, method: req.method });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});