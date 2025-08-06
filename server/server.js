import express from 'express'
import cors from 'cors'
import 'dotenv/config';
import connectDB from './configs/db.js';
import { clerkWebhooks, stripeWebhooks} from './controllers/webhooks.js'
import educatorRouter from './routes/educatorRoutes.js';
import { clerkMiddleware } from '@clerk/express';
import connectCloudinary from './configs/cloudinary.js';
import courseRouter from './routes/courseRoutes.js';
import userRouter from './routes/userRoutes.js';


// initialize express
const app = express()

// databse connect
await connectDB()
await connectCloudinary();

// middlewares
app.use(cors())
app.use(clerkMiddleware())


// routes
app.get('/', (req , res)=> res.send('Api Working'))
app.post('/clerk' , express.json(), clerkWebhooks)
app.use('/api/educator',express.json(), educatorRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter)
app.post('/stripe', express.raw({ type: 'application/json'}), stripeWebhooks)

// port 
const PORT = process.env.PORT || 5000

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})

