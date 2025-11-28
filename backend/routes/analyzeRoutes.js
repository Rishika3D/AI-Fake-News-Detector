import express from "express";
import multer from "multer";
import { analyzeUrl, analyzePdf } from "../controllers/analyzeController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/url", analyzeUrl);
router.post("/pdf", upload.single("file"), analyzePdf);

export default router;
