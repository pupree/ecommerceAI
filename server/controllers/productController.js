import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import database from "../database/db.js";
import { v2 as cloudinary} from "cloudinary";

export const createProduct = catchAsyncError(async(req, res, next) =>{
    const {name, description, price, category, stock} = req.body;
    const created_by =req.user.id;
    if(!name || !description || !price || !category || !stock){
        return next(new ErrorHandler("Please provide all required feilds",400));
    }

    let uploadedImages = [];
    if(req.files && req.files.length >0){
        const images = Array.isArray(req.files.mages) ? req.files.images : [req.files.images];
        
    }
})