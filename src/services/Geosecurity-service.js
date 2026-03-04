const express = require('express');
const iplocate = require('node-iplocate');
const router = express.Router();
const { createSecurityLog } = require('../auth/security');
const { SecurityLogs } = require('../../config/database_queries');



