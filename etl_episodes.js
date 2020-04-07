const fs = require("fs");
const fsp = fs.promises;
const { readFile, mkdir, writeFile } = fsp;
const cheerio = require("cheerio");
const got = require("got");

const stream = require("stream");
const { promisify } = require("util");
const pipeline = promisify(stream.pipeline);
const rimraf = require("rimraf");

async function main() {
  rimraf.sync("office_json/episodes_3");

  const files = await fsp.readdir("office_html/episodes");
  const all = await Promise.all(
    files
      .filter((file) => file && file.endsWith(".json"))
      .map(async (file) => {
        const filepath = `office_html/episodes/${file}`;
        const json = JSON.parse((await fsp.readFile(filepath)).toString());

        delete json.file;
        delete json.summary;

        json.season = json.season.split(" ")[1];
        json.season = Number(json.season);

        json.episodes = json.episode.split("/").map((i) => Number(i));

        json.episodeDetails = JSON.parse(
          (
            await fsp.readFile(`office_json/episodes_2/${json.title}.json`)
          ).toString()
        );

        const quotesFileName = `office_json/quotes_2/${json.title
          .replace(/\s/g, "_")
          .replace(/é/g, "e")}_Quotes.json`;

        if (fs.existsSync(quotesFileName)) {
          json.quotesDetails = JSON.parse(
            (await readFile(quotesFileName)).toString()
          );
        } else {
          console.log("File not found:", quotesFileName);
        }

        const coldOpensJson = JSON.parse(
          (
            await readFile(`office_json/cold_opens/Season ${json.season}.json`)
          ).toString()
        );

        json.coldOpens = coldOpensJson.li.filter(
          (c) => c.indexOf(`("${json.title}")`) > -1
        );

        if (!json.coldOpens.length) {
          if (json.title === "Ultimatum") {
            json.coldOpens = coldOpensJson.li.filter(
              (c) => c.indexOf(`("The Ultimatum")`) > -1
            );
          }
          if (json.title === "Café Disco") {
            json.coldOpens = coldOpensJson.li.filter(
              (c) => c.indexOf(`("Cafe Disco")`) > -1
            );
          }
        }

        json.coldOpens = json.coldOpens.map((c) =>
          c.trim().replace(/\(".+"\)$/, "")
        );

        json.storylines = json.episodeDetails.sections.filter((details) => {
          const key = ["Plot", "Summary", "Synopsis"].find(
            (t) => t === details.title
          );
          return key != null;
        });

        if (json.storylines.length !== 1) {
          console.log("Storylines:", json.storylines.length, "=>", json.title);
        } else {
          json.storylines = json.storylines[0].content.map((c) => c.text);
        }

        if (json.quotesDetails && json.quotesDetails.sections) {
          json.quotes = json.quotesDetails.sections
            .map((i) => i.content)[0]
            .map((c) => c.text);

          if (json.quotes.length === 0) {
            delete json.quotes;
          }
        }

        if (!fs.existsSync(`office_json/episodes_3`)) {
          await mkdir(`office_json/episodes_3`);
        }
        await writeFile(
          `office_json/episodes_3/${json.season}--${json.episode.replace(
            /\//g,
            "-"
          )}.json`,
          JSON.stringify(json, null, 4)
        );

        return json;
      })
  );

  await writeFile(
    "office_json/episodes_concat.json",
    JSON.stringify(all, null, 4)
  );

  console.log("Done", all[Math.floor(all.length * Math.random())]);
}

main();
