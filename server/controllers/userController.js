// import Stripe from "stripe"
import Course from "../models/Course.js"
import { Purchase } from "../models/Purchase.js"
import User from "../models/User.js"
import { CourseProgress } from "../models/CourseProgress.js"
import Razorpay from 'razorpay'

// get user data
export const getUserData = async (req, res) => {
        try {
                const userId = req.auth.userId
                const user = await User.findById(userId)

                if (!user) {
                        return res.json({ success: false, message: 'User Not Found' })
                }

                res.json({ success: true, user })
        } catch (error) {
                res.json({ success: false, message: error.message })
        }
}


// user enrolled courses with lecture link
export const userEnrolledCourses = async (req, res) => {
        try {
             const userId = req.auth.userId
             const userData = await User.findById(userId).populate('enrolledCourses')

             res.json({success: true, enrolledCourses: userData.enrolledCourses})
        } catch (error) {
       res.json({success:false ,message:error.message})
        }
}


// purchase course stripe payment
// export const purchaseCourse = async (req ,res) =>{
//   try {
//     const {courseId} = req.body
//     const {origin} = req.headers
//     const userId = req.auth.userId
//     const userData = await User.findById(userId)
//     const courseData = await Course.findById(courseId)

//     if (!userData || !courseData) {
//         return res.json({success :false, message: 'Data Not Found'})
//     }

//     const purchaseData ={
//         courseId: courseData._id,
//         userId,
//         amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2),
//     }

//     const newPurchase = await Purchase.create(purchaseData)

//     // stripe getway initialize
//     const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

//     const currency = process.env.CURRENCY.toLocaleLowerCase()

// //     creating line items to for stripe
// const line_items = [{
//      price_data: {
//           currency,
//           product_data: {
//                name: courseData.courseTitle
//           },
//           unit_amount: Math.floor(newPurchase.amount) * 100
//      },
//      quantity: 1
// }]

// const session = await stripeInstance.checkout.sessions.create({
//      success_url: `${origin}/loading/my-enrollments`,
//      cancel_url: `${origin}/`,
//      line_items: line_items,
//      mode: 'payment',
//      metadata: {
//           purchaseId: newPurchase._id.toString()
//      }
// })

// res.json({success: true, session_url: session.url})

//   } catch (error) {
//     res.json({success: false ,message: error.message})
//   }
// }


// razorpay initilize real-payment gateway
export const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    const { origin } = req.headers
    const userId = req.auth.userId

    const userData = await User.findById(userId)
    const courseData = await Course.findById(courseId)

    if (!userData || !courseData) {
      return res.json({ success: false, message: 'Data Not Found' })
    }

    const amount = (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2)

    const purchaseData = {
      courseId: courseData._id,
      userId,
      amount,
    }

    const newPurchase = await Purchase.create(purchaseData)

    // 🔁 RAZORPAY GATEWAY INITIALIZATION
    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const currency = process.env.CURRENCY.toLowerCase()

    const options = {
      amount: Math.floor(newPurchase.amount * 100), // in paise
      currency,
      receipt: newPurchase._id.toString(),
      notes: {
        courseTitle: courseData.courseTitle,
        userId: userId,
      },
    }

    const order = await razorpayInstance.orders.create(options)

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      purchaseId: newPurchase._id,
      key: process.env.RAZORPAY_KEY_ID, // needed on frontend
    })

  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}



// update user course progress
export const updateCourseProgress = async (req ,res)=>{
  try {
     const userId = req.auth.userId
     const {courseId, lectureId } = req.body
     const progressData = await CourseProgress.findOne({userId, courseId})

     if (progressData) {
          if(progressData.lectureCompleted.includes(lectureId)){
               return res.json({success: true, message: 'Lecture Already Completed'})
          }
      progressData.lectureCompleted.push(lectureId)
      await progressData.save()
     } else{
          await CourseProgress.create({
               userId, 
               courseId,
               lectureCompleted: [lectureId]
          })
     }

     res.json({success: true, message: 'Progress Updated'})

  } catch (error) {
     res.json({success: false, message: error.message})
  }
}

// get user course progress
export const getUserCourseProgress = async (req , res) =>{
     try {
         const userId = req.auth.userId
     const {courseId } = req.body
     const progressData = await CourseProgress.findOne({userId, courseId})  
       
     res.json({success: true, progressData})
     } catch (error) {
          res.json({success: false, message: error.message})
     }
}


// add user ratings to course
export const addUserRating =async (req , res) =>{
     const userId = req.auth.userId;
     const {courseId , rating} =req.body;

     if (!courseId || !userId || !rating || rating < 1 || rating > 5 ) {
         return res.json({success: false, message: 'Invalid Details'});
     }
     try {
     const course = await Course.findById(courseId);

     if (!course) {
          return res.json({success: false, message: 'Course not found.'});
     }

     const user = await User.findById(userId);

     if (!user || !user.enrolledCourses.includes(courseId)) {
          return res.json({success: false, message: 'User has not purchased this course.'});
     }

     const existingRatingIndex = course.courseRatings.findIndex( r => r.userId === userId) 

     if (existingRatingIndex > -1) {
           course.courseRatings[existingRatingIndex].rating = rating;
     }else{
        course.courseRatings.push({userId, rating})  
     }
     
     await course.save()
     
     return res.json({success: true, message: 'Rating added'})
     
     } catch (error) {
     return res.json({success: false, message: error.message}) ;
     }
}