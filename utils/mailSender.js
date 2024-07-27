const nodemailer=require("nodemailer")
require("dotenv").config()

const mailSender = async (email, title, body)=>{
    try{
        let transporter= nodemailer.createTransport({
            service: 'gmail',
            host: process.env.MAIL_HOST,
            port: 587,
            secure: false,
            auth:{
                user:process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
            debug: true,
        })

        let info = await transporter.sendMail({
            from:`user-auth-server <${process.env.MAIL_USER}>`,
            to:`${email}`,
            subject:`${title}`,
            html: `${body}`,
        })

        console.log("info",info);
        return info;
    }catch(error){
        console.log(error.message);
    }
}

module.exports = mailSender;