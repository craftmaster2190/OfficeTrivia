import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, ReplaySubject } from "rxjs";
import { randomElement, shuffle, flatten, concat } from "../util/arrays";
import { map, catchError } from "rxjs/operators";

export interface Question {
  id: string | number;
  context: string;

  questionText: string;
  correctAnswer: string;
  wrongAnswers: Array<string>;

  correctAnswerContext: string;
}

export interface ShuffledQuestion extends Question {
  shuffledAnswers: Array<string>;
}

export class EpisodeExtractor {
  public readonly targetEpisode;

  constructor(private readonly episodes: Array<any>) {
    this.targetEpisode = randomElement(episodes);
  }

  getStorylines() {
    if ((this.targetEpisode?.storylines?.length || 0) < 2) {
      throw new Error(
        "Only one storyline in episode:" + JSON.stringify(this.targetEpisode)
      );
    }

    const targetStoryLines: Array<string> = shuffle(
      this.targetEpisode.storylines.slice()
    );

    return shuffle(targetStoryLines);
  }

  getStorylinesFromSameSeason() {
    const storylinesFromSameSeason: Array<string> = shuffle(
      flatten(
        this.episodes
          .filter(
            (episode) =>
              episode.season === this.targetEpisode.season &&
              episode !== this.targetEpisode
          )
          .map((episode) => episode.storylines)
      )
    );

    return storylinesFromSameSeason;
  }
}

@Injectable({
  providedIn: "root",
})
export class QuestionService {
  private episodes = new ReplaySubject<Array<any>>(1);
  private twss = new ReplaySubject<Array<any>>(1);

  constructor(http: HttpClient) {
    http
      .get<Array<any>>("/assets/episodes.json")
      .subscribe((episodes) => this.episodes.next(episodes));
    http
      .get<Array<any>>("/assets/twss.json")
      .subscribe((twss) => this.twss.next(twss));
  }

  protected get(): Observable<Question> {
    return randomElement([this.forSeasonInWhichEpisodeDidStorylineHappen])
      .bind(this)()
      .pipe(
        catchError((error) => {
          console.error("Failed to get question. Retrying...", error);
          return this.get();
        })
      );
  }

  getShuffled(): Observable<ShuffledQuestion> {
    return this.get().pipe(map(this.applyShuffledAnswers.bind(this)));
  }

  private applyShuffledAnswers(question: Question): ShuffledQuestion {
    return {
      ...question,
      shuffledAnswers: shuffle(
        concat([question.correctAnswer], question.wrongAnswers)
      ),
    };
  }

  // In which {Episode} did {Storyline, Trivia, Quote, ThatsWhatSheSaid, ColdOpen} happen?
  private forSeasonInWhichEpisodeDidStorylineHappen(): Observable<Question> {
    return this.episodes.pipe(
      map((episodes) => new EpisodeExtractor(episodes)),
      map((extractor) => {
        const [
          questionStoryline,
          answerStoryline,
        ] = extractor.getStorylines().slice(0, 2);

        const storylinesFromSameSeason = extractor
          .getStorylinesFromSameSeason()
          .slice(0, 3);

        return {
          id: Math.random(),
          context: `In Season ${extractor.targetEpisode.season}`,

          questionText: `<div class="prefix">In the episode where this is happening:</div>
          <div class="center">${questionStoryline}</div>
          <div class="suffix">What is also happening?</div>`,
          correctAnswer: answerStoryline,
          wrongAnswers: storylinesFromSameSeason,

          correctAnswerContext: `The episode was: S${extractor.targetEpisode.season}E${extractor.targetEpisode.episode} ${extractor.targetEpisode.title}`,
        };
      })
    );
  }

  // In the {Episode}, which {Story, Quote, ThatsWhatSheSaid, ColdOpen} happened?
  // Who is this about? {Character Trivia}
  // Who said this {Quote}?
  // In the episode where {Storyline} was happening, what {Storyline} was also happening?
  // What was the {ColdOpen} for episode with {StoryLine}?
  // For the episode with {StoryLine}, what was the {ColdOpen}?
  // What {Season} does {Storyline, Quote, ThatsWhatSheSaid, ColdOpen} happen?

  /**
   * #Episode
Season
Episode
Title
Storylines[]
Primary??
Relevant Trivia[]
Quotes[]
ColdOpen
#Character
Name
Trivia[]
Quotes []
#Quote
Text
Character[]
#ThatsWhatSheSaid
Episode
Text/Context
#Question
Text
Right Answer
Wrong Answers
#Question Rating
Difficult/Impossible
Good/Medium
Easy/Obvious
Broken/Wrong
Comment
Selected Wrong Answers
==== Question Formats ====
In which {Episode} did {Storyline, Trivia, Quote, ThatsWhatSheSaid, ColdOpen} happen?
In the {Episode}, which {Story, Quote, ThatsWhatSheSaid, ColdOpen} happened?
Who is this about? {Character Trivia}
Who said this {Quote}?
In the episode where {Storyline} was happening, what {Storyline} was also happening?
What was the {ColdOpen} for episode with {StoryLine}?
For the episode with {StoryLine}, what was the {ColdOpen}?
What {Season} does {Storyline, Quote, ThatsWhatSheSaid, ColdOpen} happen? 
==== Notes ====
I avoided Deleted Scenes, Goofs, etc.
I wanted simple questions (not necessarily easy) with straightforward answers.
   */
}
