import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { AskerComponent } from "./asker.component";

describe("AskerComponent", () => {
  let component: AskerComponent;
  let fixture: ComponentFixture<AskerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AskerComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AskerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
