import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import analyzeRoutes from './routes/analyzeRoutes.js'


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET","POST"],
    allowedHeaders: ["Content-Type"]
    }));
app.use(express.json());

app.get('/', (req,res)=>{
    console.log("🔥 GET / hit");
    res.status(200).send("Backend running ✅");
})

app.use('/api/analyze', analyzeRoutes )
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
})