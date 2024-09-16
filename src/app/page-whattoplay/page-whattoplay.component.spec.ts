import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageWhattoplayComponent } from './page-whattoplay.component';

describe('PageWhattoplayComponent', () => {
  let component: PageWhattoplayComponent;
  let fixture: ComponentFixture<PageWhattoplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageWhattoplayComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PageWhattoplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
