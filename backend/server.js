require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json());

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  status: { type: String, enum: ['trial', 'active', 'suspended'], default: 'trial' },
  orders: { type: Number, default: 0 },
  commission: { type: Number, default: 5, min: 0 },
  plan: { type: String, enum: ['starter', 'business', 'enterprise'], default: 'starter' },
  revenue: { type: Number, default: 0 },
  owed: { type: Number, default: 0 },
  whatsapp: { type: String, default: '' },
  mobileMoney: { type: String, default: 'Not set' }
}, { timestamps: true });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'restaurant-admin-api' }));

app.get('/api/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    res.json(restaurants);
  } catch (error) { res.status(500).json({ message: 'Failed to fetch restaurants', error: error.message }); }
});

app.post('/api/restaurants', async (req, res) => {
  try {
    const restaurant = await Restaurant.create(req.body);
    res.status(201).json(restaurant);
  } catch (error) { res.status(400).json({ message: 'Failed to create restaurant', error: error.message }); }
});

app.patch('/api/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(restaurant);
  } catch (error) { res.status(400).json({ message: 'Failed to update restaurant', error: error.message }); }
});

app.delete('/api/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json({ message: 'Restaurant deleted' });
  } catch (error) { res.status(400).json({ message: 'Failed to delete restaurant', error: error.message }); }
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Restaurant Admin API running on port ${PORT}`));
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
}

start();
