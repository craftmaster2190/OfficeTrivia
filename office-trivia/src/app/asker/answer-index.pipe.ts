import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "answerIndex",
})
export class AnswerIndexPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    switch (value) {
      case 0:
        return "A";
      case 1:
        return "B";
      case 2:
        return "C";
      case 3:
        return "D";
    }
    return null;
  }
}
