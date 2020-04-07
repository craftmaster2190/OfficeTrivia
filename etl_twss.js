const fs = require("fs");
const fsp = fs.promises;
const { readFile, mkdir, writeFile } = fsp;
const cheerio = require("cheerio");
const got = require("got");

const stream = require("stream");
const { promisify } = require("util");
const pipeline = promisify(stream.pipeline);
const rimraf = require("rimraf");

const instances = {};

function getInstance(season, episode) {
  const key = season + "-" + episode;
  instances[key] = instances[key] || 0;
  return String(++instances[key]);
}

async function main() {
  let twssArray = JSON.parse(
    (await readFile(`office_json/thatsWhatSheSaid.json`)).toString()
  );

  twssArray = twssArray
    .map((twss) => {
      const [seasonAndEpisode, instance] = twss.productionNumber.split("-");
      const [season, episode] = seasonAndEpisode.split(".");

      twss = {
        ...twss,
        episodeName: twss.episode,
        season,
        episode,
        instance: instance || getInstance(season, episode),
      };

      delete twss.productionNumber;

      twss.twssSpeaker = twss.speaker;
      delete twss.speaker;

      let [contextSpeaker, ...contents] = twss.context.split(":");
      let contextText = contents.join(":");
      try {
        contextText = JSON.parse(contextText);

        delete twss.context;

        twss = { ...twss, contextSpeaker, contextText };
      } catch (err) {
        contextText = twss.context;
        contextSpeaker = undefined;
      }

      if (!contextSpeaker) {
        delete twss.contextSpeaker;
      }

      const twssNew = {};

      Object.keys(twss).forEach((key) => {
        twssNew[key] = twss[key].trim();
        if (twssNew[key] == Number(twssNew[key])) {
          twssNew[key] = Number(twssNew[key]);
        }
      });

      return twssNew;
    })
    .filter((twss) => {
      if (!twss.contextSpeaker) {
        console.log("No speaker!", twss);
        return true;
      }
      return true;
    });

  await writeFile(
    `office_json/thatsWhatSheSaid_2.json`,
    JSON.stringify(twssArray, null, 4)
  );

  console.log("Done", twssArray[Math.floor(twssArray.length * Math.random())]);
}

main();
