import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import bcrypt from "bcrypt";
import { sendToken } from "../utils/jwtToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateEmailTemplate } from "../utils/generateForgotPasswordEmailTemplate.js";
import { generateResetPasswordToken } from "../utils/generateResetPasswordToken.js";
import crypto from "crypto";
import {v2 as cloudinary} from "cloudinary";
import { getUploadedFile } from "../utils/getUploadedFile.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";

export const register = catchAsyncError(async(req, res, next) =>{
    const {name, email, password} = req.body;
    const normalizedEmail = normalizeEmail(email);

    if(!name || !normalizedEmail || !password){
        return next(new ErrorHandler("Please provide all required fields", 400));
    }

    if (password.length < 8 || 
        password.length > 16){
        return next(new ErrorHandler("Password must be between 8 and 16 characters.", 400));
    }

    const isAlreadyRegistered = await database.query(`SELECT * FROM users WHERE LOWER(email) = $1`, [normalizedEmail]);
    if(isAlreadyRegistered.rows.length > 0){
        return next(new ErrorHandler("User already registered", 400));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = await database.query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`, 
            [name.trim(), normalizedEmail, hashedPassword]
        );
        sendToken(user.rows[0], 201, "User registered successfully", res);
    } catch (error) {
        if (error?.code === '23505') {
            return next(new ErrorHandler("User already registered", 400));
        }
        return next(error);
    }
});

export const login = catchAsyncError(async(req, res, next) =>{
    const {email, password} = req.body;
    const normalizedEmail = normalizeEmail(email);

    if(!normalizedEmail || !password){
        return next(new ErrorHandler("Please provide email and password", 400));
    }

    const user = await database.query(`SELECT * FROM users WHERE LOWER(email) = $1`, [normalizedEmail]);
    if(user.rows.length === 0){
        return next(new ErrorHandler("Invalid email or password", 401));
    }

    const isPasswordMatch = await bcrypt.compare(password, user.rows[0].password);
    if(!isPasswordMatch){
        return next(new ErrorHandler("Invalid email or password", 401))
    }
    sendToken(user.rows[0], 200, "logged in successfully", res);
});

export const getUser = catchAsyncError(async(req, res, next) =>{
    const { user } = req;
    res.status(200).json({
        success: true,
        user,
    });
});

export const logout = catchAsyncError(async(req, res, next) =>{
    res.status(200).cookie("token", "", {
        expires: new Date(Date.now()),
        httpOnly: true,     
    }).json({
        success: true,
        message: "Logged out successfully."
    })
});

export const forgotPassword = catchAsyncError(async(req, res, next) =>{
    const {email} = req.body;
    const {frontendUrl} = req.query;
    const normalizedEmail = normalizeEmail(email);
    let userResult = await database.query(
        `SELECT * FROM users WHERE LOWER(email) = $1`, [normalizedEmail]
    );
    if (userResult.rows.length === 0){
        return next(new ErrorHandler("User not found with this email.", 404))
    ;}
    const user = userResult.rows[0];
    const {hashedToken, resetPasswordExpireTime, resetToken} = generateResetPasswordToken();
    await database.query(
        `UPDATE users SET reset_password_token = $1, reset_password_expire = to_timestamp($2) WHERE LOWER(email) = $3`,
        [hashedToken, resetPasswordExpireTime / 1000, normalizedEmail]
    );

    const frontendBaseUrl = frontendUrl || process.env.FRONTEND_URL || "";
    const baseUrl = frontendBaseUrl ? frontendBaseUrl.replace(/\/$/, "") : "";
    const resetPasswordUrl = `${baseUrl}/password/reset/${encodeURIComponent(resetToken)}`;

    const message = generateEmailTemplate(resetPasswordUrl);
    try {
        await sendEmail({
            email: user.email,
            subject: "Ecommerce Password Recovery",
            message,
        });
        res.status(200).json({
            success: true, 
            message: `Email send to ${user.email} successfully`,
        });

    } catch (error) {
        await database.query(
            `UPDATE users SET reset_password_token = NULL, reset_password_expire = NULL WHERE LOWER(email) = $1`,
            [normalizedEmail]
        );
        return next(new ErrorHandler("Email could not be sent", 500));
    }
})

export const resetPassword = catchAsyncError(async(req, res, next) =>{
    const {token} = req.params;
    const rawToken = token?.trim() ?? "";
    const normalizedToken = decodeURIComponent(rawToken);
    const resetPasswordToken = crypto.createHash("sha256").update(normalizedToken).digest('hex');

 

    let user = await database.query(
        `SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expire > NOW()`,
        [resetPasswordToken]
    );
  

    if (user.rows.length === 0) {
        user = await database.query(
            `SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expire > NOW()`,
            [normalizedToken]
        );

        console.log('[RESET DEBUG] Second query (with plain token) result:', user.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
    }

    if (user.rows.length === 0) {
        console.log('[RESET DEBUG] ERROR: Token not found or expired');
        return next(new ErrorHandler("Invalid or expired reset token.", 400));
    }
    if (req.body.password !== req.body.confirmPassword){
        return next(new ErrorHandler("Password do not match.", 400));
    }

    if (req.body.password?.length < 8 ||
        req.body.password?.length > 16 ||
        req.body.confirmPassword?.length < 8 ||
        req.body.confirmPassword?.length > 16){
        return next(new ErrorHandler("Password must be between 8 and 16 characters.", 400));
    };
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const updatedUser = await database.query(`UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expire = NULL WHERE id = $2 RETURNING *`,
        [hashedPassword, user.rows[0].id]
    );
    sendToken(updatedUser.rows[0], 200, 'Password reset successfully', res);
})

export const updatePassword = catchAsyncError(async(req, res, next) => {
    const {currentPassword, newPassword, confirmNewPassword} = req.body;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(new ErrorHandler("Please provide all required fields", 400))
    }
    const isPasswordMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isPasswordMatch) {
        return next(new ErrorHandler("Current password is incorrect", 401))
    }
    if (newPassword !== confirmNewPassword) {
        return next(new ErrorHandler("New password do not match", 400))
    }
        if (newPassword.length < 8 ||
        newPassword.length > 16 ||
        confirmNewPassword.length < 8 ||
        confirmNewPassword.length > 16){
        return next(new ErrorHandler("Password must be between 8 and 16 characters.", 400));
    };

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await database.query(`UPDATE users SET password =$1 WHERE id = $2`, [hashedPassword, req.user.id]);

    res.status(200).json({
        success: true,
        message: "Password Updated successfully"
    })

})

export const updateProfile = catchAsyncError(async(req, res, next) => {
    const {name, email} = req.body;
    if(!name || !email){
        return next(new ErrorHandler("Please provide all required fields", 400))
    }
    if(name.trim().length === 0 || email.trim().length === 0){
        return next(new ErrorHandler("Name and Email cannot be empty", 400))
    }
    let avatarData = {};
    const uploadedFile = getUploadedFile(req);
    if(uploadedFile){
        if(req.user?.avatar?.public_id){
            await cloudinary.uploader.destroy(req.user.avatar.public_id);
        }
        const newProfileImage = await cloudinary.uploader.upload(uploadedFile.tempFilePath || uploadedFile.tempfilePath, {
            folder: "Ecommerce_Avatar",
            width: 150,
            crop: "scale",
        })
        avatarData = {
            public_id: newProfileImage.public_id,
            url: newProfileImage.secure_url,
        }
    }

    let user;
    if(Object.keys(avatarData).length === 0){
        user = await database.query(
            `UPDATE users SET name = $1, email =$2 WHERE id = $3 RETURNING *`, [name, email, req.user.id]
        );
    }else{
        user = await database.query(
            `UPDATE users SET name = $1, email =$2, avatar = $3 WHERE id = $4 RETURNING *`, [name, email, avatarData, req.user.id]
        )
    }

    res.status(200).json({
        success: true,
        message: "Profile Updated successfully",
        user: user.rows[0]
    })

})