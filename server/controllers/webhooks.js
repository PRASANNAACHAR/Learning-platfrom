import { Webhook } from "svix";
import User from '../models/User.js'
// import Stripe from "stripe";
import crypto from 'crypto';
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";


// api controller function to manage clerk user with database

export const clerkWebhooks = async (req, res)=> {
    try {
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
        
        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp":req.headers["svix-timestamp"],
            "svix-signature":req.headers["svix-signature"]
        })

        const {data, type} = req.body
        
        switch (type) {
            case 'user.created':{
            const userData = {
                _id: data.id,
                email: data.email_addresses[0].email_address,
                name: data.first_name + " " + data.last_name,
                imageUrl : data.image_url,
            }
            await User.create(userData)
            res.json({})
            break;
            }

            case 'user.updated': {
            const userData = {
                email: data.email_address[0].email_address,
                name: data.first_name + " " + data.last_name,
                imageUrl : data.image_url,
            }
            await User.findByIdAndUpdate(data.id, userData)
            res.json({})
            break;
            }

            case 'user.deleted' : {
                await User.findByIdAndDelete(data.id)
                res.json({})
                break;
            }
        
            default:
                break;
        }
    } catch (error) {
        res.json({success: false, message:error.message})
    }
}




// const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

// // STRIPE WEBHOOKS
// export const stripeWebhooks = async (request ,response) =>{
//    const sig = request.headers['stripe-signature'];

//    let event;

//    try {
//     event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

//    } catch (err) {
//     response.status(400).send(`webhook Error: ${err.message}`);
//    }

// //    handle the event
// switch (event.type) {
//     case 'payment_intent.succeeded':{
//         const paymentIntent = event.data.object;
//         const paymentIntentId = paymentIntent.id;
        
//         const session = await stripeInstance.checkout.sessions.list({
//             payment_intent: paymentIntentId
//         })

//         const {purchaseId} = session.data[0].metadata;

//         const purchaseData = await Purchase.findById(purchaseId);
//         const userData  = await User.findById(purchaseData.userId);
//         const courseData = await Course.findById(purchaseData.courseId.toString())
        
//         courseData.enrolledStudents.push(userData)
//         await courseData.save()

//         userData.enrolledCourses.push(courseData._id)
//         await userData.save()

//         purchaseData.status = 'completed'
//         await purchaseData.save()

//         break;
//     }

//     // 
//     case 'payment_intent.payment_failed':{
//          const paymentIntent = event.data.object;
//         const paymentIntentId = paymentIntent.id;
        
//         const session = await stripeInstance.checkout.sessions.list({
//             payment_intent: paymentIntentId
//         })

//         const {purchaseId} = session.data[0].metadata;

//         const purchaseData = await Purchase.findById(purchaseId)
//         purchaseData.status = 'failed'
//         await purchaseData.save()

//     break;
//     }
// //     hand;e other event types
//     default:
//         console.log(`Unhandled event type ${event.type}`);    
// }

// // return a response to acknolwdge recept of the event
// response.json({recevied: true});
// }




// razorpay payment webhook

export const razorpayWebhooks = async (request, response) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  const signature = request.headers['x-razorpay-signature'];
  const body = JSON.stringify(request.body);

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.warn('❌ Invalid Razorpay webhook signature');
    return response.status(400).json({ error: 'Invalid webhook signature' });
  }

  const { event, payload } = request.body;

  try {
    if (!payload || !payload.payment || !payload.payment.entity) {
      return response.status(400).json({ error: 'Invalid payload structure' });
    }

    const payment = payload.payment.entity;
    const purchaseId = payment.notes?.purchaseId;

    if (!purchaseId) {
      return response.status(400).json({ error: 'Missing purchaseId in notes' });
    }

    const purchaseData = await Purchase.findById(purchaseId);
    if (!purchaseData) {
      return response.status(404).json({ error: 'Purchase not found' });
    }

    if (event === 'payment.captured') {
      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(purchaseData.courseId.toString());

      if (!userData || !courseData) {
        return response.status(404).json({ error: 'User or Course not found' });
      }

      // Avoid duplicates
      if (!courseData.enrolledStudents.includes(userData._id)) {
        courseData.enrolledStudents.push(userData._id);
        await courseData.save();
      }

      if (!userData.enrolledCourses.includes(courseData._id)) {
        userData.enrolledCourses.push(courseData._id);
        await userData.save();
      }

      purchaseData.status = 'completed';
      await purchaseData.save();

    } else if (event === 'payment.failed') {
      purchaseData.status = 'failed';
      await purchaseData.save();

    } else {
      console.log(`Unhandled event type: ${event}`);
    }

    return response.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
};