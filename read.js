const fs = require("fs");
const cheerio = require("cheerio");
const got = require("got");

const stream = require("stream");
const { promisify } = require("util");
const pipeline = promisify(stream.pipeline);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);

async function main() {
  const all = await readdir("office_html/episodes").then((files) =>
    Promise.all(
      files
        .filter((file) => file && file.endsWith(".json"))
        .map(async (file) => {
          const filepath = `office_html/episodes/${file}`;
          const json = JSON.parse((await readFile(filepath)).toString());

          delete json.file;

          json.season = json.season.split(" ")[1];
          json.season = Number(json.season);

          json.episodes = json.episode.split("/").map((i) => Number(i));

          json.episodeDetails = JSON.parse(
            (
              await readFile(`office_json/episodes_2/${json.title}.json`)
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
              await readFile(
                `office_json/cold_opens/Season ${json.season}.json`
              )
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

          return json;
        })
    )
  );

  console.log("Done", all[Math.floor(all.length * Math.random())]);
}

main();
