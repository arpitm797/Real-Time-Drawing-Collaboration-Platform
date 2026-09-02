import { Request,Response,NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
)=>{
    try{
        const authHeader = req.headers.authorization;

        if(!authHeader){
            return res.status(401).json({
                message:"Auth header missing",
            })
        }

        const token = authHeader.split(" ")[1];

        if(!token){
            return res.status(401).json({
                message:"token missing",
            })
        }

        const decode = jwt.verify(
            token,
            process.env.JWT_SECRET as string) as {userId? : number};
        
            req.userId = decode.userId;

             next();
        } catch (error) {
            return res.status(401).json({
            message: "Invalid or expired token",
            });

    }
}