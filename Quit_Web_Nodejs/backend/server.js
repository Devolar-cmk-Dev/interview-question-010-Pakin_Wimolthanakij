const express = require('express');

const sql = require('mssql/msnodesqlv8'); 
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());


const dbConfig = {
    server: 'DESKTOP-TN18MTD', 
    database: 'QuizSystem',
    driver: 'ODBC Driver 18 for SQL Server',
    options: { 
        trustedConnection: true, // เปิดใช้งาน Windows Authentication
        encrypt: false, 
        trustServerCertificate: true 
    },
    pool: {
        max: 200, 
        min: 10,  
        idleTimeoutMillis: 30000
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Connected to MS SQL Database (Windows Authentication)');
        loadAnswersCache(pool); 
        return pool;
    })
    .catch(err => {
        console.error('❌ Database Connection Failed!', err);
        process.exit(1);
    });

// ระบบ Cache เฉลยข้อสอบ
let cachedAnswers = [];
let totalQuestionsCount = 0;

async function loadAnswersCache(pool) {
    try {
        const result = await pool.request().query('SELECT Id, CorrectChoice FROM Questions');
        cachedAnswers = result.recordset;
        totalQuestionsCount = cachedAnswers.length;
        console.log(`✅ Loaded ${totalQuestionsCount} questions into memory cache`);
    } catch (err) {
        console.error('❌ Error loading cache:', err);
    }
}

// API: ดึงข้อสอบไปแสดงที่ Frontend
app.get('/api/questions', async (req, res) => {
    try {
        const pool = await poolPromise; 
        const result = await pool.request().query('SELECT Id, QuestionText, Choice1, Choice2, Choice3, Choice4 FROM Questions');
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching questions:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: ส่งคำตอบ 
app.post('/api/submit', async (req, res) => {
    const { name, answers } = req.body;
    
    if (!name || !answers || typeof answers !== 'object') {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    try {
        let score = 0;

        cachedAnswers.forEach(q => {
            if (answers[q.Id] === q.CorrectChoice) {
                score++;
            }
        });

        const pool = await poolPromise;
        
        await pool.request()
            .input('Name', sql.NVARCHAR, name)
            .input('Score', sql.INT, score)
            .input('Total', sql.INT, totalQuestionsCount)
            .query('INSERT INTO ExamResults (ExamineeName, Score, Total) VALUES (@Name, @Score, @Total)');

        res.status(200).json({ name, score, total: totalQuestionsCount });
    } catch (err) {
        console.error('Error submitting quiz:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});