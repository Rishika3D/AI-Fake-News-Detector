import express from "express"
import { signUpUser, loginUser } from "../controllers/userController.js"

const router = express.Router();

router.post("/signup", signUpUser);
router.post("/login", loginUser);

export default router;