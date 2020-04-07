import * as fs from "fs";
import QuestionGenerator from "./generate-question";
import InWhichEpisodeForStoryline from "./modules/inWhichEpisode-Storyline";

const fsp = fs.promises;
const { readFile } = fsp;

async function main() {
  const episodes = await readFile(
    "../office_json/episodes_concat.json"
  ).then((buf) => JSON.parse(buf.toString()));
  const gen = new QuestionGenerator([new InWhichEpisodeForStoryline(episodes)]);

  const question = gen.generate();
  console.log(question);

  return question;
}

main();
