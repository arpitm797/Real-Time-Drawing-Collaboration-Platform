import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "@repo/db";
import  jwt  from "jsonwebtoken";

const router: ReturnType<typeof Router> = Router();

router.post("/signup", async (req,res) => {
    try {
        const{name , email , password} = req.body;

        if (!name || !email || !password){
            return res.status(400).json({
                message:"Name,email and pass is required"
            })
        }
        const existingUser = await prisma.user.findUnique({
            where:{
                email,
            },
        });

        if(existingUser){
           return res.status(409).json({
                message:"user already exists"
            })
        }

        const hashedPassword = await bcrypt.hash(password,10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            }
        })

        return res.status(201).json({
            messge:"user created succesfully",
            user:{
                id: user.id,
                name: user.name,
                email: user.email,
            }
        })

        
    } catch (error) {
        console.error("signup error", error);

        return res.status(500).json({
            message: "server error",
    });
        
    }
    
})

router.post("/signin",async (req,res) => {
    try {
         const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
     const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
      const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      message: "Signin successful",
      token,
    });
    } catch (error) {
        
         console.error("SIGNIN ERROR:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
    }
    
})


export default router;


