import db from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const signUpUser= async(req, res)=>{
    try{
        const {username, email, password}= req.body
        if(!username || !email || !password){
            return res.status(400).json({ error: "All fields are required"})
        }

        const hash = await bcrypt.hash(password, 10);

        const result= await db.query(`INSERT INTO USERS (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id`, username, email, [username, email, password])
        res.json({ message: "SignUp successful", user: result.rows[0]})
    }catch(err){
        console.error("Signup error:", err);
        res.status(500).json({ error: "Signup failed" });
    }
}


export const loginUser = async(req, res)=>{
    try{
        const {email, password}= req.body
        const userRes= await db.query("SELECT * FROM users where email= $1", [email])
        if(userName.rows.length===0){
            return res.status(400).json({error: "User not found"})
        }

        const user= userRes.rows[0]
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(400).json({ error: "Invalid password" });
    
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ message: "Login success", token, user });
    }catch(err){
        console.error("Login error:", err);
        res.status(500).json({ error: "Login failed" });
    }
}