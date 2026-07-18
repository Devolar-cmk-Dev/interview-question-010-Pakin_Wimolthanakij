-- 1. สร้างฐานข้อมูล
CREATE DATABASE QuizSystem;
GO
USE QuizSystem;
GO

-- 2. สร้างตารางสำหรับเก็บข้อสอบ (Questions)
CREATE TABLE Questions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    QuestionText NVARCHAR(255) NOT NULL,
    Choice1 NVARCHAR(100) NOT NULL,
    Choice2 NVARCHAR(100) NOT NULL,
    Choice3 NVARCHAR(100) NOT NULL,
    Choice4 NVARCHAR(100) NOT NULL,
    CorrectChoice INT NOT NULL
);
GO

-- 3. สร้างตารางสำหรับเก็บประวัติและคะแนน (ExamResults)
CREATE TABLE ExamResults (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ExamineeName NVARCHAR(100) NOT NULL,
    Score INT NOT NULL,
    Total INT NOT NULL,
    ExamDate DATETIME DEFAULT GETDATE()
);
GO

-- 4. เพิ่มข้อมูลข้อสอบสาย Programming จำนวน 10 ข้อ (รองรับภาษาไทยด้วย N)
INSERT INTO Questions (QuestionText, Choice1, Choice2, Choice3, Choice4, CorrectChoice)
VALUES 
(N'1. ฟีเจอร์ใดใน Angular ที่เป็นตัวหลักในการจัดการ State แบบ Fine-Grained Reactivity', N'RxJS', N'NgRx', N'Signals', N'Promises', 3),
(N'2. ไลบรารีใดใน Python ที่นิยมใช้ประมวลผลรูปภาพร่วมกับโมเดล Computer Vision อย่าง YOLO', N'Pandas', N'OpenCV', N'Django', N'Requests', 2),
(N'3. คำสั่งใดใน MS SQL ที่ใช้สำหรับ "ลบโครงสร้างตาราง" ออกจากฐานข้อมูล', N'DELETE TABLE', N'REMOVE TABLE', N'TRUNCATE TABLE', N'DROP TABLE', 4),
(N'4. Framework ในข้อใดที่ออกแบบมาเพื่อสร้างและจัดการระบบ AI แบบ Multi-Agent', N'LangGraph', N'TensorFlow', N'PyTorch', N'Scikit-learn', 1),
(N'5. Next.js เป็น Framework ที่พัฒนาต่อยอดมาจากไลบรารี (Library) ใด', N'Angular', N'Vue.js', N'React', N'Svelte', 3),
(N'6. ในการพัฒนา IoT บอร์ดไมโครคอนโทรลเลอร์ยี่ห้อใดที่มีระบบ Cloud Platform เป็นของตัวเอง', N'STM32', N'Arduino Uno', N'Particle', N'Raspberry Pi', 3),
(N'7. ไฟล์ใดในโปรเจกต์ ASP.NET Core ยุคใหม่ ที่ใช้สำหรับตั้งค่า Dependency Injection เป็นหลัก', N'web.config', N'Program.cs', N'package.json', N'appsettings.json', 2),
(N'8. คำสั่งใดของ Git ที่ใช้ส่งโค้ดจากเครื่อง Local ขึ้นไปยัง Remote Repository', N'git pull', N'git commit', N'git push', N'git merge', 3),
(N'9. HTTP Status Code ใดที่บ่งบอกว่าเกิดข้อผิดพลาดที่ฝั่งเซิร์ฟเวอร์ (Internal Server Error)', N'200 OK', N'400 Bad Request', N'404 Not Found', N'500 Internal Server Error', 4),
(N'10. โมเดล PaddleOCR เหมาะสำหรับนำมาประยุกต์ใช้งานในข้อใดมากที่สุด', N'สกัดเวกเตอร์ใบหน้า', N'แปลงเสียงเป็นข้อความ', N'อ่านตัวอักษรจากป้ายทะเบียน', N'ทำนายยอดขายสินค้า', 3);
GO