const jwt = require("jsonwebtoken")
require("dotenv").config()

exports.auth = async (req, res, next) =>{
    try{
        const token = req.cookies.token 
                        || req.body.token 
                        || req.header("Authorisation").replace("Bearer ", "");
        if(!token){
            return res.status(401).json({
                success:false,
                message:"token is missing",
            })
        }
        try{
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            console.log("decode",decode);
            req.user = decode;
            
        }catch(err){
            return res.status(401).json({
                success:false,
                message:"token is invalid"
            })
        }
        next();
    }
    catch (error){
        console.log(error)
        return res.status(401).json({
            success:false,
            message:"Something went wrong while verification"
        })
    }
};