import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, ReplaySubject } from "rxjs";
import {
  randomElement,
  shuffle,
  flatten,
  concat,
  truthy,
} from "../util/arrays";
import { map, catchError } from "rxjs/operators";
import { difference } from "../util/sets";

interface Quote {
  speaker: string;
  content: string;
}

type QuoteCollection = Array<Quote>;

interface Episode {
  season: number;
  title: string;
  episode: string;
  episodes: Array<number>;
  coldOpens: Array<string>;
  storylines: Array<string>;
  quotes: Array<QuoteCollection>;
}

interface ThatsWhatSheSaid {
  episode: number;
  episodeName: string;
  season: number;
  instance: number;
  twssSpeaker: string;
  contextSpeaker: string;
  contextText: string;
}

export interface Question {
  id: string | number;
  context: string;

  questionText: {
    prefix: string;
    center: string;
    suffix: string;
  };
  correctAnswer: string;
  wrongAnswers: Array<string>;

  correctAnswerContext: string;
}

export interface ShuffledQuestion extends Question {
  shuffledAnswers: Array<string>;
}

export class EpisodeExtractor {
  public readonly targetEpisode: Episode;

  constructor(private readonly episodes: Array<Episode>) {
    this.targetEpisode = randomElement(episodes);
  }

  getQuotes(): Array<QuoteCollection> {
    if (!this.targetEpisode?.quotes?.length) {
      throw new Error(
        "No quotes in episode:" + JSON.stringify(this.targetEpisode)
      );
    }

    return shuffle(
      this.targetEpisode.quotes
        .slice()
        .filter(
          (quoteCollection) =>
            truthy(quoteCollection) &&
            quoteCollection.every((quote) => truthy(quote.speaker))
        )
    );
  }

  getQuotesFromSameSeason(): Array<QuoteCollection> {
    const quotes = shuffle(
      flatten(
        this.episodes
          .filter(
            (episode) =>
              episode.season === this.targetEpisode.season &&
              episode !== this.targetEpisode
          )
          .map((episode) => episode.quotes)
      ).filter(
        (quoteCollection) =>
          truthy(quoteCollection) &&
          quoteCollection.every((quote) => truthy(quote.speaker))
      )
    );

    if (!quotes?.length) {
      throw new Error(
        "No quotes in season for episode:" + JSON.stringify(this.targetEpisode)
      );
    }

    return quotes;
  }

  getSpeakersFromSameSeason(): Set<string> {
    const speakers = new Set<string>();

    this.getQuotesFromSameSeason().forEach((quotes) =>
      quotes.forEach((quote) => speakers.add(quote.speaker))
    );

    if (!speakers.size) {
      throw new Error(
        "No speakers in season for episode:" +
          JSON.stringify(this.targetEpisode)
      );
    }

    return speakers;
  }

  getColdOpens(): Array<string> {
    if (!this.targetEpisode?.coldOpens?.length) {
      throw new Error(
        "No cold opens in episode:" + JSON.stringify(this.targetEpisode)
      );
    }

    return shuffle(this.targetEpisode.coldOpens.slice());
  }

  getColdOpensFromSameSeason(): Array<string> {
    const coldOpens = shuffle(
      flatten(
        this.episodes
          .filter(
            (episode) =>
              episode.season === this.targetEpisode.season &&
              episode !== this.targetEpisode
          )
          .map((episode) => episode.coldOpens)
      )
    );

    if (!coldOpens?.length) {
      throw new Error(
        "No cold opens in season for episode:" +
          JSON.stringify(this.targetEpisode)
      );
    }

    return coldOpens;
  }

  getStorylines(): Array<string> {
    if ((this.targetEpisode?.storylines?.length || 0) < 2) {
      throw new Error(
        "Only one storyline in episode:" + JSON.stringify(this.targetEpisode)
      );
    }

    return shuffle(this.targetEpisode.storylines.slice());
  }

  getStorylinesFromSameSeason(): Array<string> {
    const storylines = shuffle(
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

    if (!storylines?.length) {
      throw new Error(
        "No storylines in season for episode:" +
          JSON.stringify(this.targetEpisode)
      );
    }

    return storylines;
  }
}

@Injectable({
  providedIn: "root",
})
export class QuestionService {
  private episodes = new ReplaySubject<Array<Episode>>(1);
  private twss = new ReplaySubject<Array<ThatsWhatSheSaid>>(1);

  constructor(http: HttpClient) {
    http
      .get<Array<Episode>>("/assets/episodes.json")
      .subscribe((episodes) => this.episodes.next(episodes));
    http
      .get<Array<ThatsWhatSheSaid>>("/assets/twss.json")
      .subscribe((twss) => this.twss.next(twss));
  }

  protected get(): Observable<Question> {
    return randomElement([
      this.forSeasonForStorylineWhichStorylineHappened,
      this.forSeasonForEpisodeForStorylineWhichStorylineHappened,
      this.forSeasonForColdOpenWhichStorylineHappened,
      this.forSeasonForEpisodeForStorylineWhichColdopenHappened,
      this.forSeasonForEpisodeWhoSaidWhatQuote,
    ])
      .bind(this)()
      .pipe(
        catchError((error) => {
          console.error("Failed to get question. Retrying...", error);
          return this.get();
        })
      );
  }

  getShuffled(): Observable<ShuffledQuestion> {
    return this.get().pipe(
      map(this.applyShuffledAnswers),
      catchError<ShuffledQuestion, Observable<ShuffledQuestion>>((error) => {
        console.error("Failed to get shuffled question. Retrying...", error);
        return this.getShuffled();
      })
    );
  }

  private applyShuffledAnswers = (question: Question): ShuffledQuestion => {
    return {
      ...question,
      shuffledAnswers: shuffle(
        concat([question.correctAnswer], question.wrongAnswers)
      ).filter((val) => {
        if (truthy(val)) {
          return true;
        }
        throw new Error(
          "Not every answer was truthy in question:" + JSON.stringify(question)
        );
      }),
    };
  };

  private extractor(mapper: (extractor: EpisodeExtractor) => Question) {
    return this.episodes.pipe(
      map((episodes) => new EpisodeExtractor(episodes)),
      map(mapper)
    );
  }

  // In the Episode where {Storyline} happened, what {Storyline} also happened?
  private forSeasonForStorylineWhichStorylineHappened(): Observable<Question> {
    return this.extractor((extractor) => {
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

        questionText: {
          prefix: "In the episode where this is happening:",
          center: questionStoryline,
          suffix: "What is also happening?",
        },
        correctAnswer: answerStoryline,
        wrongAnswers: storylinesFromSameSeason,

        correctAnswerContext: `The episode was: S${extractor.targetEpisode.season}E${extractor.targetEpisode.episode} ${extractor.targetEpisode.title}`,
      };
    });
  }

  // In the {Episode} where {Storyline} happened, what {Storyline} also happened?
  private forSeasonForEpisodeForStorylineWhichStorylineHappened(): Observable<
    Question
  > {
    return this.extractor((extractor) => {
      const [
        questionStoryline,
        answerStoryline,
      ] = extractor.getStorylines().slice(0, 2);

      const storylinesFromSameSeason = extractor
        .getStorylinesFromSameSeason()
        .slice(0, 3);

      return {
        id: Math.random(),
        context: `In Season ${extractor.targetEpisode.season} Episode ${extractor.targetEpisode.episode}`,

        questionText: {
          prefix: `In this episode: ${extractor.targetEpisode.title} where this is happening:`,
          center: questionStoryline,
          suffix: "What is also happening?",
        },
        correctAnswer: answerStoryline,
        wrongAnswers: storylinesFromSameSeason,

        correctAnswerContext: `The episode was: S${extractor.targetEpisode.season}E${extractor.targetEpisode.episode} ${extractor.targetEpisode.title}`,
      };
    });
  }

  // In the Episode where {ColdOpen} happened, what {Storyline} also happened?
  private forSeasonForColdOpenWhichStorylineHappened(): Observable<Question> {
    return this.extractor((extractor) => {
      const questionColdOpen = extractor.getColdOpens()[0];

      const answerStoryline = extractor.getStorylines()[0];

      const storylinesFromSameSeason = extractor
        .getStorylinesFromSameSeason()
        .slice(0, 3);

      return {
        id: Math.random(),
        context: `In Season ${extractor.targetEpisode.season}`,

        questionText: {
          prefix: "In the episode with this cold open:",
          center: questionColdOpen,
          suffix: "What is also happening?",
        },
        correctAnswer: answerStoryline,
        wrongAnswers: storylinesFromSameSeason,

        correctAnswerContext: `The episode was: S${extractor.targetEpisode.season}E${extractor.targetEpisode.episode} ${extractor.targetEpisode.title}`,
      };
    });
  }

  // In the {Episode} where {Storyline} happened, what {ColdOpen} also happened?
  private forSeasonForEpisodeForStorylineWhichColdopenHappened(): Observable<
    Question
  > {
    return this.extractor((extractor) => {
      const questionStoryline = extractor.getStorylines()[0];

      const answerColdOpen = extractor.getColdOpens()[0];

      const coldOpensFromSameSeason = extractor
        .getColdOpensFromSameSeason()
        .slice(0, 3);

      return {
        id: Math.random(),
        context: `In Season ${extractor.targetEpisode.season} Episode ${extractor.targetEpisode.episode}`,

        questionText: {
          prefix: `In this episode: ${extractor.targetEpisode.title} where this is happening:`,
          center: questionStoryline,
          suffix: "What is also happening?",
        },
        correctAnswer: answerColdOpen,
        wrongAnswers: coldOpensFromSameSeason,

        correctAnswerContext: `The episode was: S${extractor.targetEpisode.season}E${extractor.targetEpisode.episode} ${extractor.targetEpisode.title}`,
      };
    });
  }

  // Who said this {Quote}?
  private forSeasonForEpisodeWhoSaidWhatQuote(): Observable<Question> {
    return this.extractor((extractor) => {
      const questionQuote = extractor.getQuotes()[0];

      const correctSpeakers = new Set<string>();
      questionQuote.forEach((quote) => correctSpeakers.add(quote.speaker));
      const wrongSpeakers = shuffle(
        Array.from(
          difference(extractor.getSpeakersFromSameSeason(), correctSpeakers)
        )
      ).slice(0, 3);
      const selectedSpeaker = shuffle(Array.from(correctSpeakers))[0];

      if (wrongSpeakers.length < 3) {
        throw new Error(
          "There was not at least 3 wrong speakers: " +
            JSON.stringify(extractor.targetEpisode)
        );
      }

      const quoteTextWithBlanks = questionQuote
        .map((quote) => {
          const speaker =
            quote.speaker === selectedSpeaker
              ? '<div class="blank"></div>'
              : quote.speaker;
          return (
            `<div class="quote-speaker">${speaker}</div>` +
            `<div class="quote-content">${quote.content}</div>`
          );
        })
        .join("<br>");

      return {
        id: Math.random(),
        context: `In Season ${extractor.targetEpisode.season} Episode ${extractor.targetEpisode.episode}`,

        questionText: {
          prefix: `In this episode: ${extractor.targetEpisode.title} with this quote:`,
          center: `<div class="quotes">${quoteTextWithBlanks}</div>`,
          suffix: "Who is the missing speaker?",
        },
        correctAnswer: selectedSpeaker,
        wrongAnswers: wrongSpeakers,

        correctAnswerContext: `The episode was: S${extractor.targetEpisode.season}E${extractor.targetEpisode.episode} ${extractor.targetEpisode.title}`,
      };
    });
  }

  // In which {Episode} did {Trivia, Quote, ThatsWhatSheSaid, ColdOpen} happen?
  // In the {Episode}, which {Story, Quote, ThatsWhatSheSaid, ColdOpen} happened?
  // Who is this about? {Character Trivia}
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
