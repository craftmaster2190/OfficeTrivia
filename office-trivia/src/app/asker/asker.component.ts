import { Component, OnInit } from "@angular/core";
import { tap, debounce } from "rxjs/operators";
import {
  Question,
  QuestionService,
  ShuffledQuestion,
} from "../question/question.service";
import { interval } from "rxjs";

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

  constructor(private readonly questionService: QuestionService) {}

  ngOnInit(): void {
    this.loadQuestion();
  }

  loadQuestion() {
    this.state = AskerState.LOADING;
    this.questionService
      .getShuffled()
      .pipe(
        debounce(() => interval(1000)),
        tap(() => (this.state = AskerState.ASKING))
      )
      .subscribe((question) => (this.question = question));
  }

  answerIndex(index) {
    const selectedAnswer = this.question.shuffledAnswers[index];
    const isCorrect = selectedAnswer === this.question.correctAnswer;
    if (isCorrect) {
      this.state = AskerState.RIGHT;
      this.correctStreak++;
    } else {
      this.state = AskerState.WRONG;
      this.correctStreak = 0;
    }
    this.questionDifficulty = null;
    this.feedbackComment = "";
  }

  onClickNextQuestion() {
    if (this.questionDifficulty || this.feedbackComment) {
      this.submitFeedback();
    }

    this.loadQuestion();
  }

  private submitFeedback() {}
}
