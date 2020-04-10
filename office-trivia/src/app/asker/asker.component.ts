import { Component, OnInit, NgZone, NgModule } from "@angular/core";
import { interval } from "rxjs";
import { debounce, tap } from "rxjs/operators";
import {
  QuestionService,
  ShuffledQuestion,
} from "../question/question.service";
import * as confetti from "canvas-confetti";

enum AskerState {
  LOADING = "LOADING",
  ASKING = "ASKING",
  WRONG = "WRONG",
  RIGHT = "RIGHT",
}

enum QuestionDifficulty {
  IMPOSSIBLE = "IMPOSSIBLE",
  DIFFICULT = "DIFFICULT",
  JUST_RIGHT = "JUST_RIGHT",
  EASY = "EASY",
  OBVIOUS = "OBVIOUS",
}

function animate(
  start: number,
  end: number,
  time: number,
  perform: (value) => void
) {
  const startIsBigger = start > end;
  const difference = end - start;
  const stepInterval = 16;
  const steps = time / stepInterval;
  const stepLength = difference / steps;

  let current = start;
  const interval = window.setInterval(() => {
    console.log("animate", current, start, end, stepInterval);
    if (current < end) {
      perform(current);
      // if (startIsBigger) {
      //   current -= stepLength;
      // } else {
      current += stepLength;
      // }
    } else {
      window.clearInterval(interval);
    }
  }, stepInterval);
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

@Component({
  selector: "app-asker",
  templateUrl: "./asker.component.html",
  styleUrls: ["./asker.component.scss"],
})
export class AskerComponent implements OnInit {
  state: AskerState;
  question: ShuffledQuestion;
  correctStreak = 0;
  questionDifficulty: QuestionDifficulty;
  feedbackComment;
  selectedIndex;

  constructor(
    private readonly questionService: QuestionService,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadQuestion();
  }

  loadQuestion() {
    this.state = AskerState.LOADING;
    this.question = null;
    this.selectedIndex = null;
    this.questionService
      .getShuffled()
      .pipe(
        debounce(() => interval(1000)),
        tap(() => (this.state = AskerState.ASKING))
      )
      .subscribe((question) => {
        this.question = question;
      });
  }

  answerIndex(index) {
    this.selectedIndex = index;
    if (this.isCorrect(index)) {
      this.state = AskerState.RIGHT;
      this.correctStreak++;
      this.onCorrectThrowConfetti();
    } else {
      this.state = AskerState.WRONG;
      this.correctStreak = 0;
    }
    this.questionDifficulty = null;
    this.feedbackComment = "";
  }

  isCorrect(index) {
    const selectedAnswer = this.question.shuffledAnswers[index];
    return selectedAnswer === this.question.correctAnswer;
  }

  onClickNextQuestion() {
    if (this.questionDifficulty || this.feedbackComment) {
      this.submitFeedback();
    }

    this.loadQuestion();
  }

  private submitFeedback() {}

  async onCorrectThrowConfetti() {
    this.ngZone.runOutsideAngular(() => {
      var duration = 1800;
      var animationEnd = Date.now() + duration;
      var defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 1000,
      };

      var interval = setInterval(function () {
        var timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        var particleCount = 150 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti.create(null, { resize: true })(
          Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          })
        );
        confetti.create(null, { resize: true })(
          Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          })
        );
      }, 350);
    });
  }
}
