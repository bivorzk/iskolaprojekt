const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const mongodb = require('mongodb');

const dbUrl = 'mongodb+srv://bzkugli_db_user:P5HxcxzhTC24DCt2@cluster0.kkpdosb.mongodb.net/';
const dbName = 'Projekt_vizsgaremek';

router.use(express.urlencoded({ extended: true }));

mongoose.connect(dbUrl + dbName, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
