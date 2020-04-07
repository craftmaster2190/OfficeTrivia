import { Generator, Question } from "./modules/generator";
import { randomElement } from "./arrays";

export default class QuestionGenerator {
  constructor(private readonly generators: Array<Generator>) {}

  generate(): Question {
    return randomElement(this.generators).generate();
  }
}
