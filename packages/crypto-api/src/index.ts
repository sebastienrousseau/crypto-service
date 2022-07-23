import minimist from 'minimist';
import * as fs from "fs";
import { createMarkdown, response } from './util';

function init() {
  const args = minimist(process.argv.slice(2));
  const path = args[`_`];
  if (path.length > 0) {
    console.log(`Reading file ${path[0]}`)
    console.log(args);
    console.log(path);
    if (fs.existsSync(path[0])) {
      console.log(`Generating markdown file ...`)
      const rawData = fs.readFileSync(path[0]);
      const json = JSON.parse(rawData.toString());
      let markdown = createMarkdown(json)
      // console.log(markdown);
      markdown += '[divider]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/divider.svg'
      const fileName = path[1].split('.')
      console.log(fileName);
      response(markdown, fileName[0])

    } else {
      console.log(`Path is not valid or the file not exist.`);
    }
  } else {
    console.log(`Path of json file is required.`);
  }
}

init();
