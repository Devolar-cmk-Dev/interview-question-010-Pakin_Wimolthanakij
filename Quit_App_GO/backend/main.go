package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	_ "github.com/microsoft/go-mssqldb"
)

type Question struct {
	Id           int    `json:"Id"`
	QuestionText string `json:"QuestionText"`
	Choice1      string `json:"Choice1"`
	Choice2      string `json:"Choice2"`
	Choice3      string `json:"Choice3"`
	Choice4      string `json:"Choice4"`
}

type CachedAnswer struct {
	Id            int
	CorrectChoice int
}

type SubmitRequest struct {
	Name    string         `json:"name"`
	Answers map[string]int `json:"answers"`
}

type SubmitResponse struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
	Total int    `json:"total"`
}

// ตัวแปร Global สำหรับจำลองระบบ Cache ของเดิม
var (
	db                  *sql.DB
	cachedAnswers       []CachedAnswer
	totalQuestionsCount int
	cacheMutex          sync.RWMutex
)


func initDB() {
	// ตั้งค่า Connection String แบบ Windows Authentication
	connString := "server=DESKTOP-TN18MTD;database=QuizSystem;trusted_connection=yes;encrypt=disable;"

	var err error
	db, err = sql.Open("sqlserver", connString)
	if err != nil {
		log.Fatal("❌ Error creating connection pool: ", err.Error())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err = db.PingContext(ctx); err != nil {
		log.Fatal("❌ Database Connection Failed! ", err.Error())
	}

	fmt.Println("✅ Connected to MS SQL Database (Windows Authentication)")
	loadAnswersCache()
}

func loadAnswersCache() {
	cacheMutex.Lock()
	defer cacheMutex.Unlock()

	rows, err := db.Query("SELECT Id, CorrectChoice FROM Questions")
	if err != nil {
		log.Println("❌ Error loading cache:", err.Error())
		return
	}
	defer rows.Close()

	cachedAnswers = nil
	for rows.Next() {
		var ans CachedAnswer
		if err := rows.Scan(&ans.Id, &ans.CorrectChoice); err != nil {
			log.Println("Error scanning cache row:", err.Error())
			continue
		}
		cachedAnswers = append(cachedAnswers, ans)
	}
	totalQuestionsCount = len(cachedAnswers)
	fmt.Printf("✅ Loaded %d questions into memory cache\n", totalQuestionsCount)
}


func getQuestions(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT Id, QuestionText, Choice1, Choice2, Choice3, Choice4 FROM Questions")
	if err != nil {
		http.Error(w, `{"error": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var questions []Question
	for rows.Next() {
		var q Question
		if err := rows.Scan(&q.Id, &q.QuestionText, &q.Choice1, &q.Choice2, &q.Choice3, &q.Choice4); err != nil {
			continue
		}
		questions = append(questions, q)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(questions)
}

func submitQuiz(w http.ResponseWriter, r *http.Request) {
	var req SubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "ข้อมูลไม่ครบถ้วน"}`, http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Answers == nil {
		http.Error(w, `{"error": "ข้อมูลไม่ครบถ้วน"}`, http.StatusBadRequest)
		return
	}

	// ตรวจคำตอบผ่าน Cache
	score := 0
	cacheMutex.RLock()
	for _, ca := range cachedAnswers {
		idStr := strconv.Itoa(ca.Id) // แปลง ID เป็น String เพราะมาจาก JSON Object Keys
		if userAns, ok := req.Answers[idStr]; ok && userAns == ca.CorrectChoice {
			score++
		}
	}
	total := totalQuestionsCount
	cacheMutex.RUnlock()

	// บันทึกลงฐานข้อมูลแบบ ป้องกัน SQL Injection ด้วย Query Parameters
	_, err := db.Exec("INSERT INTO ExamResults (ExamineeName, Score, Total) VALUES (@p1, @p2, @p3)", req.Name, score, total)
	if err != nil {
		log.Println("Error inserting result:", err)
		http.Error(w, `{"error": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}

	res := SubmitResponse{Name: req.Name, Score: score, Total: total}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}


func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*") // รองรับการเรียกจาก Angular
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// ดักจับ Preflight Request ของเบราว์เซอร์
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// สร้างการเชื่อมต่อ DB ตอนเปิดเซิร์ฟเวอร์
	initDB()

	mux := http.NewServeMux()

	// จัดการ Endpoint แบบเดียวกับ Express
	mux.HandleFunc("/api/questions", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			getQuestions(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/submit", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			submitQuiz(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// ครอบ Routes ทั้งหมดด้วย CORS Middleware
	handler := corsMiddleware(mux)

	fmt.Println("🚀 Server is running on http://localhost:3000")
	log.Fatal(http.ListenAndServe(":3000", handler))
}