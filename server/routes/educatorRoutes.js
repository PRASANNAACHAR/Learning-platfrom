import express from 'express';
import { addCourse, educatorDashboardData, getEducatorCourses, getEnrolledStudentsData, UpdateRoleEducator } from '../controllers/educatorController.js';
import upload from '../configs/multer.js';
import { protectEducator } from '../middlewares/AuthMiddleware.js';


const educatorRouter = express.Router()

// add educator role
educatorRouter.get('/update-role', UpdateRoleEducator)
educatorRouter.post('/add-course', upload.single('image'),protectEducator, addCourse)
educatorRouter.get('/courses', protectEducator, getEducatorCourses)
educatorRouter.get('/dashboard', protectEducator,educatorDashboardData)
educatorRouter.get('/enrolled-students', protectEducator,getEnrolledStudentsData)


export default educatorRouter;