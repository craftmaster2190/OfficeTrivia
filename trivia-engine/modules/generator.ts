export interface Question {
  id: number | string;
  context?: string;
  questionText: string;
  correctAnswer: string;
  wrongAnswers: Array<String>;
}

export abstract class Generator {
  abstract generate(): Question;
}
