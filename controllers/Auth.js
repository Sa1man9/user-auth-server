const User=require("../models/User");
const OTP=require("../models/OTP");
const otpGenerator=require("otp-generator");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const mailSender= require("../utils/mailSender");
require("dotenv").config()

exports.sendOTP= async (req,res) => {
    try{
        const {email}=req.body;

        const checkUserPresent= await User.findOne({email});

        if(checkUserPresent){
            return res.status(401).json({
                success:false,
                message:"User already registered"
            })
        }
        var otp=otpGenerator.generate(6,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false
        })

        console.log("OTP Generated: ", otp);

        let result = await OTP.findOne({otp : otp});

        while(result){
            otp=otpGenerator.generate(6,{
                upperCaseAlphabets:false,
                lowerCaseAlphabets:false,
                specialChars:false
            });
            result = await OTP.findOne({otp : otp});
        }

        const otpPayload = {email,otp};

        const otpBody = await OTP.create(otpPayload);

        console.log(otpBody);

        res.status(200).json({
            success: true,
            message:"OTP Sent Successfully",
            otp,
        });
    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }  
};

exports.signUp = async (req,res)=>{
    try{
        const{
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            otp
        }=req.body;
    
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp){
            return res.status(403).json({
                success:false,
                message:"All fields required"
            })
        }

        if(password !== confirmPassword){
            return res.status(400).json({
                success:false,
                message:"Password do not match"
            })
        }

        const existingUser = await User.findOne({email});

        if(existingUser){
            res.status(400).json({
                success:false,
                message:"User is already registered",
            })
        }

        const recentOtp= await OTP.find({email}).sort({createdAt:-1}).limit(1);
        console.log(recentOtp);

        if(recentOtp.length === 0){
            return res.status(400).json({
                success:false,
                message:"OTP not found"
            })
        }else if(otp !== recentOtp[0].otp){
            return res.status(400).json({
                success:false,
                message:"Invalid OTP"
            })
        }


        const hashedPassword = await bcrypt.hash(password, 10);


        const user = await User.create({
            firstName,
            lastName,
            email,
            password:hashedPassword,
        })

        return res.status(200).json({
            success:true,
            message:"user is registered succesfully",
            user,
        })
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"User cannot be registered. Please try again"
        })
    }

  
};


exports.login = async (req,res)=>{

    try{

        const {email, password} = req.body;

        if(!email || !password){
            return res.status(403).json({
                success:false,
                message:"All fields required"
            })
        }

        const user = await User.findOne({email})

        if(!user){
            return res.status(401).json({
                success:false,
                message:"User is not registered, please signUp first"
            });
        }

        if(await bcrypt.compare(password, user.password)){

            const payload={
                email : user.email,
                id: user._id,
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn:"24h",
            })

            user.token = token;
            user.password = undefined;

            const options = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                httpOnly:true,
            }

            res.cookie("token", token, options).status(200).json({
                success:true,
                token,
                user,
                message:'Logged in successfully',
            })
        }
        else{
           res.status(401).json({
                success:true,
                message:"Incorrect Password"
           }) 
        }
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message:"login failed, please try again"
        })
        
    }
};


exports.changePassword = async (req,res, next) => {
try {

    const userDetails = await User.findById(req.user.id);

    const {oldPassword,newPassword,confirmNewPassword}=req.body;

    const isPasswordMatch = await bcrypt.compare(
        oldPassword,
        userDetails.password
    );

    if(oldPassword==newPassword){
        return res.status(400).json({
            success:false,
            message:"New Password cannot be same as old password"
        });
    }

    if(!isPasswordMatch){
                return res
                .status(401)
                .json({ success: false, message: "The password is incorrect" });
    }

    if(newPassword !==confirmNewPassword){
        return res.status(400).json({
            success:false,
            message:"The Password and Confirm Passworddoes not match"
        })
    }

	const encryptedPassword = await bcrypt.hash(newPassword, 10);
	const updatedUserDetails = await User.findByIdAndUpdate(
		req.user.id,
		{ password: encryptedPassword },
		{ new: true }
	);

    try {
        const emailResponse = await mailSender(
            updatedUserDetails.email,
            "user-auth-server - Password Updated",
            `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
        );
        console.log("Email sent successfully:", emailResponse);
    } catch (error) {
        console.error("Error occurred while sending email:", error);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				error: error.message,
			});
    }

    return res
			.status(200)
			.json({ success: true, message: "Password updated successfully" });
}
catch(error){
    console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});
}
};