import { Generator, Question } from "./generator";
import * as fs from "fs";
import { randomElement, shuffle, concat, flatten } from "../arrays";

const fsp = fs.promises;
const { readFile } = fsp;

export default class InWhichEpisodeForStoryline extends Generator {
  constructor(private readonly episodes: Array<any>) {
    super();
  }

  generate(): Question {
    const targetEpisode = randomElement(this.episodes);

    if ((targetEpisode?.storylines?.length || 0) < 2) {
      throw new Error(
        "Only one storyline in episode:" + JSON.stringify(targetEpisode)
      );
    }

    const targetStoryLines: Array<string> = shuffle(
      targetEpisode.storylines.slice()
    );

    const [questionStoryline, answerStoryline, ...ignored] = targetStoryLines;

    const storylinesFromSameSeason: Array<string> = shuffle(
      flatten(
        this.episodes
          .filter(
            (episode) =>
              episode.season === targetEpisode.season &&
              episode !== targetEpisode
          )
          .map((episode) => episode.storylines)
      )
    );

    storylinesFromSameSeason.length = 3;

    return {
      id: Math.random(),
      context: `In Season ${targetEpisode.season}`,

      questionText: `In the episode where this is happening:\n${questionStoryline}\nWhat is also happening?`,
      correctAnswer: answerStoryline,
      wrongAnswers: storylinesFromSameSeason,
    };
  }
}
