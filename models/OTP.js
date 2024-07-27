const mongoose=require("mongoose")
const mailSender = require("../utils/mailSender");

const OTPSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
    },
    otp:{
        type:String,
        required:true,
    },
    createdAt:{
        type:Date,
        default:Date.now(),
        expires:60 * 5,
    }
});

async function sendVerificationEmail(email,otp){
    try{
        console.log(email);
        const mailResponse= await mailSender(email, "Verification Email from user-auth-server", otp);
        console.log("Email sent successfully: ", mailResponse);
    }catch(error){
        console.log("error occurred while sending mail ",error);
        throw error;
    }
};

OTPSchema.pre("save", async function(next){
    console.log("New document saved to database");
    if (this.isNew) {
		await sendVerificationEmail(this.email, this.otp);
	}
	next();
});


module.exports = mongoose.model("OTP", OTPSchema);

 