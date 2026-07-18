import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

export interface Question {
  Id: number;
  QuestionText: string;
  Choice1: string;
  Choice2: string;
  Choice3: string;
  Choice4: string;
}

export interface SubmitResult {
  name: string;
  score: number;
  total: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss' // หรือ .css ตามโปรเจกต์ของคุณ
})
export class AppComponent implements OnInit {
  private http = inject(HttpClient);

  // สถานะของหน้าจอ: 'start' (หน้าแรก), 'exam' (กำลังสอบ), 'result' (ผลสอบ)
  examState = signal<'start' | 'exam' | 'result'>('start');
  
  // ข้อมูลข้อสอบและคำตอบ
  questions = signal<Question[]>([]);
  answers = signal<Record<number, number>>({});
  examineeName = signal('');
  result = signal<SubmitResult | null>(null);

  // ระบบแบ่งหน้า (Pagination)
  currentPage = signal(1);
  itemsPerPage = 5;
  totalPages = computed(() => Math.ceil(this.questions().length / this.itemsPerPage));
  paginatedQuestions = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.questions().slice(start, start + this.itemsPerPage);
  });

  // ระบบจับเวลา
  readonly EXAM_DURATION = 30 * 60; // 30 นาที
  timeLeft = signal(this.EXAM_DURATION);
  timerInterval: any;

  // จัดรูปแบบเวลาให้อ่านง่าย (MM:SS)
  formattedTime = computed(() => {
    const minutes = Math.floor(this.timeLeft() / 60);
    const seconds = this.timeLeft() % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  ngOnInit() {
    this.loadQuestions();
  }

  loadQuestions() {
    this.http.get<Question[]>('http://localhost:3000/api/questions').subscribe({
      next: (res) => this.questions.set(res),
      error: (err) => {
        console.error(err);
        alert('ไม่สามารถโหลดข้อสอบได้ กรุณาตรวจสอบ Backend');
      }
    });
  }

  startExam() {
    if (!this.examineeName().trim()) {
      alert('กรุณากรอกชื่อ-สกุลก่อนเริ่มทำข้อสอบ');
      return;
    }

    this.examState.set('exam');
    this.timeLeft.set(this.EXAM_DURATION);

    this.timerInterval = setInterval(() => {
      this.timeLeft.update(t => t - 1); // ลดเวลาลงทีละ 1 วินาที

      if (this.timeLeft() <= 0) {
        clearInterval(this.timerInterval);
        alert('หมดเวลาการทำข้อสอบ! ระบบกำลังส่งข้อสอบอัตโนมัติ');
        this.submitQuiz(true);
      }
    }, 1000);
  }

  cancelExam() {
    if (confirm('คุณต้องการยกเลิกการทำข้อสอบใช่หรือไม่?')) {
      this.examineeName.set('');
    }
  }

  changePage(delta: number) {
    this.currentPage.update(p => {
      const newPage = p + delta;
      return Math.max(1, Math.min(newPage, this.totalPages()));
    });
  }

  // อัปเดตคำตอบลง State
  setAnswer(questionId: number, choice: number) {
    this.answers.update(ans => ({ ...ans, [questionId]: choice }));
  }

  submitQuiz(isAutoSubmit = false) {
    const totalAnswered = Object.keys(this.answers()).length;
    const totalQuestions = this.questions().length;

    // ตรวจสอบการตอบครบ (ถ้าไม่ใช่การส่งอัตโนมัติ)
    if (!isAutoSubmit && totalAnswered < totalQuestions) {
      alert(`กรุณาตอบคำถามให้ครบทุกข้อ (คุณทำไปแล้ว ${totalAnswered} จาก ${totalQuestions} ข้อ)`);
      return;
    }

    clearInterval(this.timerInterval);

    const payload = {
      name: this.examineeName(),
      answers: this.answers()
    };

    this.http.post<SubmitResult>('http://localhost:3000/api/submit', payload).subscribe({
      next: (res) => {
        this.result.set(res);
        this.examState.set('result');
      },
      error: (err) => {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการส่งข้อสอบ');
      }
    });
  }

  resetQuiz() {
    this.examState.set('start');
    this.examineeName.set('');
    this.answers.set({});
    this.currentPage.set(1);
    this.result.set(null);
    this.loadQuestions();
  }
}