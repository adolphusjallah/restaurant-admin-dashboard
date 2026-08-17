require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'change-this-secret-in-production';
const TOKEN_TTL = 60 * 60 * 24;

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  status: { type: String, enum: ['trial','active','suspended'], default: 'trial' }, plan: { type: String, enum: ['starter','business','enterprise'], default: 'starter' },
  commission: { type: Number, default: 5, min: 0, max: 100 }, whatsapp: { type: String, default: '' }, mobileMoney: { type: String, default: 'Not set' }
}, { timestamps: true });
const userSchema = new mongoose.Schema({ email: { type: String, required: true, unique: true, lowercase: true, trim: true }, passwordHash: String, role: { type: String, enum: ['admin','owner'], default: 'owner' }, restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null }, active: { type: Boolean, default: true } }, { timestamps: true });
const orderSchema = new mongoose.Schema({ restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }, customerName: { type: String, required: true }, items: { type: Array, default: [] }, total: { type: Number, required: true, min: 0 }, status: { type: String, enum: ['pending','confirmed','completed','cancelled'], default: 'pending' } }, { timestamps: true });
const paymentSchema = new mongoose.Schema({ restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }, order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, amount: { type: Number, required: true, min: 0 }, method: { type: String, enum: ['cash','lonestar','orange','mtn','bank','card'], required: true }, status: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' } }, { timestamps: true });
const Restaurant = mongoose.model('Restaurant', restaurantSchema); const User = mongoose.model('User', userSchema); const Order = mongoose.model('Order', orderSchema); const Payment = mongoose.model('Payment', paymentSchema);

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`; }
function verifyPassword(password, stored) { const [salt, hash] = String(stored || '').split(':'); if (!salt || !hash) return false; const candidate = crypto.scryptSync(password, salt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(hash,'hex'), Buffer.from(candidate,'hex')); }
function signToken(user) { const payload = Buffer.from(JSON.stringify({ id: user._id.toString(), role: user.role, exp: Math.floor(Date.now()/1000)+TOKEN_TTL })).toString('base64url'); const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url'); return `${payload}.${sig}`; }
function auth(req,res,next) { const token=(req.headers.authorization||'').replace(/^Bearer\s+/,''); if(!token)return res.status(401).json({message:'Authentication required'}); const [payload,sig]=token.split('.'); try { const expected=crypto.createHmac('sha256',TOKEN_SECRET).update(payload).digest('base64url'); if(!sig||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) throw new Error(); const data=JSON.parse(Buffer.from(payload,'base64url').toString()); if(data.exp<Math.floor(Date.now()/1000)) throw new Error(); req.auth=data; next(); } catch { return res.status(401).json({message:'Invalid or expired token'}); } }
const adminOnly=(req,res,next)=>req.auth.role==='admin'?next():res.status(403).json({message:'Admin access required'});
function slugify(s){return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}

app.get('/api/health',(req,res)=>res.json({ok:true,service:'restaurant-admin-api',database:mongoose.connection.readyState===1}));
app.post('/api/auth/login',async(req,res)=>{try{const email=String(req.body.email||'').toLowerCase().trim();const user=await User.findOne({email});if(!user||!user.active||!verifyPassword(req.body.password,user.passwordHash))return res.status(401).json({message:'Invalid email or password'});res.json({token:signToken(user),user:{id:user._id,email:user.email,role:user.role,restaurant:user.restaurant}});}catch(e){res.status(500).json({message:'Login failed',error:e.message})}});
app.get('/api/auth/me',auth,async(req,res)=>{const user=await User.findById(req.auth.id).select('-passwordHash');if(!user)return res.status(404).json({message:'User not found'});res.json(user)});

app.get('/api/dashboard',auth,async(req,res)=>{const filter=req.auth.role==='admin'?{}:{restaurant:req.auth.restaurant};const [restaurants,orders,payments]=await Promise.all([Restaurant.find(req.auth.role==='admin'?{}:{_id:req.auth.restaurant}),Order.find(filter),Payment.find(filter)]);const completed=orders.filter(o=>o.status==='completed');const revenue=completed.reduce((s,o)=>s+o.total,0);const commission=restaurants.reduce((s,r)=>s+(revenue*(r.commission||0)/100),0);res.json({restaurants:restaurants.length,orders:orders.length,completedOrders:completed.length,revenue,commission,owedToAdmin:commission,payments:payments.length});});

app.get('/api/restaurants',auth,async(req,res)=>{try{const data=await Restaurant.find().sort({createdAt:-1});res.json(data.map(r=>r.toObject()))}catch(e){res.status(500).json({message:'Failed to fetch restaurants',error:e.message})}});
app.post('/api/restaurants',auth,adminOnly,async(req,res)=>{try{const data={...req.body,slug:slugify(req.body.slug||req.body.name)};const r=await Restaurant.create(data);if(req.body.ownerEmail&&req.body.ownerPassword){await User.create({email:req.body.ownerEmail,passwordHash:hashPassword(req.body.ownerPassword),role:'owner',restaurant:r._id});}res.status(201).json(r)}catch(e){res.status(400).json({message:'Failed to create restaurant',error:e.message})}});
app.patch('/api/restaurants/:id',auth,adminOnly,async(req,res)=>{try{const allowed=['name','slug','status','commission','plan','whatsapp','mobileMoney'];const data={};for(const k of allowed)if(req.body[k]!==undefined)data[k]=k==='slug'?slugify(req.body[k]):req.body[k];const r=await Restaurant.findByIdAndUpdate(req.params.id,data,{new:true,runValidators:true});if(!r)return res.status(404).json({message:'Restaurant not found'});res.json(r)}catch(e){res.status(400).json({message:'Failed to update restaurant',error:e.message})}});
app.delete('/api/restaurants/:id',auth,adminOnly,async(req,res)=>{try{const r=await Restaurant.findByIdAndDelete(req.params.id);if(!r)return res.status(404).json({message:'Restaurant not found'});await User.deleteMany({restaurant:r._id});await Order.deleteMany({restaurant:r._id});await Payment.deleteMany({restaurant:r._id});res.json({message:'Restaurant deleted'})}catch(e){res.status(400).json({message:'Failed to delete restaurant',error:e.message})}});

app.get('/api/orders',auth,async(req,res)=>{const filter=req.auth.role==='admin'?{}:{restaurant:req.auth.restaurant};res.json(await Order.find(filter).populate('restaurant','name').sort({createdAt:-1}))});
app.post('/api/orders',auth,async(req,res)=>{try{if(req.auth.role!=='admin')req.body.restaurant=req.auth.restaurant;const o=await Order.create(req.body);res.status(201).json(o)}catch(e){res.status(400).json({message:'Failed to create order',error:e.message})}});
app.patch('/api/orders/:id',auth,async(req,res)=>{const filter={_id:req.params.id,...(req.auth.role==='admin'?{}:{restaurant:req.auth.restaurant})};const o=await Order.findOneAndUpdate(filter,req.body,{new:true,runValidators:true});if(!o)return res.status(404).json({message:'Order not found'});res.json(o)});
app.get('/api/payments',auth,async(req,res)=>{const filter=req.auth.role==='admin'?{}:{restaurant:req.auth.restaurant};res.json(await Payment.find(filter).populate('restaurant','name').sort({createdAt:-1}))});
app.post('/api/payments',auth,async(req,res)=>{try{if(req.auth.role!=='admin')req.body.restaurant=req.auth.restaurant;const p=await Payment.create(req.body);if(p.status==='paid'){const o=await Order.findById(p.order);if(o){o.status='completed';await o.save()}}res.status(201).json(p)}catch(e){res.status(400).json({message:'Failed to create payment',error:e.message})}});

async function bootstrap(){if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required');await mongoose.connect(process.env.MONGODB_URI);if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){const email=process.env.ADMIN_EMAIL.toLowerCase();const existing=await User.findOne({email});if(!existing)await User.create({email,passwordHash:hashPassword(process.env.ADMIN_PASSWORD),role:'admin'});}app.listen(PORT,()=>console.log(`Restaurant Admin API running on port ${PORT}`));}
bootstrap().catch(e=>{console.error('Startup error:',e.message);process.exit(1)});
