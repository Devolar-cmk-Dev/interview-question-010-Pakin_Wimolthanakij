import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      // ต้อง mock HttpClient ด้วยเพราะ Component เรามีการเรียกใช้ API
      providers: [provideHttpClient(), provideHttpClientTesting()] 
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should start with examState as "start"', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    // ตรวจสอบว่าเริ่มต้นมา State เป็น start ตามที่เราเขียนไว้
    expect(app.examState()).toEqual('start');
  });

  it('should render start page title', () => {  
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // ตรวจสอบว่ามีคำว่า ระบบทดสอบความรู้ แสดงอยู่
    expect(compiled.querySelector('h2')?.textContent).toContain('ระบบทดสอบความรู้ (IT 10)');
  });
});
