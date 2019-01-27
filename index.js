const express = require("express");
const request = require("request-promise");

// google translate setup
const Translate = require("@google-cloud/translate");
const projectId = "searchwithoutinternet";
const translate = new Translate.Translate({
  projectId: projectId
});

const app = express();
const bodyParser = require("body-parser");
const port = process.env.PORT || 1337;
const WEB = "web";
const YELP = "yelp";
const WIKI = "wiki";
const TR = "tr";
const HELP = "help";
const validTypes = [WEB, YELP, WIKI, TR, HELP];
const supportedLanguages = ["en", "fr", "ru", "de", "es"];

const yelp_key = "002412142127618762442:e7hmnqop_ai";
const wiki_key = "002412142127618762442:q3eq1hoh6wu";
const goog_key = "016717304083729390418:3pmwddke6q4";
const api_key = "AIzaSyAk8DBiHCVqJJaIoebDgaShY9R647qN37E";
//const map_key = 

const DEFAULT_SEARCH_LIMIT = 5;
const DEFAULT_TRANSLATE_LANGUAGE = "fr";

app.use(bodyParser.urlencoded({ extended: false }));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
  // console.log(parseMessage("yelp: chinese"));
  // console.log(parseMessage("yelp 10: chinese"));
  // console.log(parseMessage("hello world"));
  // searchTranslation("Hello world", "de").then(console.log);
});
app.get("/", (req, res) => {
  res.send("Application Base");
});

const MessagingResponse = require("twilio").twiml.MessagingResponse;

search("india", 10, goog_key, parseResponseGoog).then(function(val) {
  console.log(val);
});

app.post("/sms", (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMessage = req.body.Body.toLowerCase();
  const searchQuery = parseMessage(incomingMessage);
  if (searchQuery === null) {
    twiml.message(
      "Invalid Search Query, please make query of form 'type limit search'"
    );
    sendMessage(res, twiml, 200);
  } else {
    let opt = searchQuery.hasOwnProperty("amount")
      ? searchQuery.amount
      : searchQuery.lang;
    makeQuery(searchQuery.type, opt, searchQuery.query).then(function(value) {
      twiml.message(value);
      sendMessage(res, twiml, 200);
    });
  }
});

function makeQuery(type, opt, query) {
  if (type === WEB) {
    return search(query, opt, goog_key, parseResponseGoog);
  } else if (type === WIKI) {
    return search(query, opt, wiki_key, parseResponseWiki);
  } else if (type === YELP) {
    return search(query, opt, yelp_key, parseResponseYelp);
  } else if (type === TR) {
    return searchTranslation(query, opt);
  }
}

function sendMessage(res, twiml, status) {
  res.writeHead(status, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
}

function search(query, amount, key, parsing) {
  const url =
    "https://www.googleapis.com/customsearch/v1?key=" +
    api_key +
    "&cx=" +
    key +
    "&q=" +
    query +
    "&num=" +
    amount;

  const options = {
    url: url,
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Charset": "utf-8"
    }
  };

  return request(options).then(function(body) {
    let json = JSON.parse(body);
    response = parsing(json, amount);
    response = appendAdd(response);
    console.log(json);
    return response;
  });
}

function appendAdd(response) {
  response += " \n \n YOUR AD HERE ";
  return response;
}

function searchTranslation(text, lang) {
  return translate.translate(text, lang).then(function(translated) {
    return parseResponseTranslate(translated, lang);
  });
}

//parses the sent text message into {type, amount, query} -- returns null if msg is malformed
function parseMessage(msg) {
  // msg will look like 'wiki 10: germany' or 'wiki: germany' or 'yelp 5: chinese food' or 'yelp: chinese'
  // or 'tr fr: hello world' or 'tr ru: hello world'
  const prefixes = msg
    .split(":")[0]
    .split(" ", 2)
    .map(val => val.trim());
  const type = prefixes[0];
  const query =
    msg.split(":").length > 1 ? msg.split(":")[1].trim() : undefined;

  if (type === TR) {
    const lang = prefixes.length > 1 ? prefixes[1] : DEFAULT_TRANSLATE_LANGUAGE;
    const isValid = supportedLanguages.includes(lang) && query !== undefined;
    return isValid ? { type: type, lang: lang, query: query } : null;
  } else {
    const amount =
      prefixes.length > 1 ? Number(prefixes[1]) : DEFAULT_SEARCH_LIMIT;
    const isValid =
      validTypes.includes(type) && !Number.isNaN(amount) && query !== undefined;
    return isValid ? { type: type, amount: amount, query: query } : null;
  }
}

function parseResponseGoog(json, amount) {
  output = "";
  for (i = 0; i < amount; i++) {
    k = 1 + i;
    output += "result:" + k + "\n";
    output += JSON.stringify(json.items[i].title) + "\n";
    output += JSON.stringify(json.items[i].snippet) + "\n";
    output += "\n";
  }
  return output;
}

function parseResponseWiki(json, amount) {
  output = "";
  for (i = 0; i < amount; i++) {
    k = 1 + i;
    output += "result:" + k + "\n";
    output += JSON.stringify(json.items[i].title) + "\n";
    output += JSON.stringify(json.items[i].snippet) + "\n";
    output += "\n";
  }
  return output;
}

function parseResponseYelp(json, amount) {
  output = "";
  for (i = 0; i < amount; i++) {
    k = 1 + i;
    output += "result:" + k + "\n";
    output += JSON.stringify(json.items[i].title) + "\n";
    output += JSON.stringify(json.items[i].snippet) + "\n";
    output +=
      "Overall rating: " +
      JSON.stringify(json.items[i].pagemap.aggregaterating[0].ratingvalue) +
      "\n";
    output +=
      "Number of reviews: " +
      JSON.stringify(json.items[i].pagemap.aggregaterating[0].reviewcount) +
      "\n";
    output +=
      JSON.stringify(json.items[i].pagemap.postaladdress[0].streetaddress) +
      "\n";
    output += "\n";
  }
  return output;
}

function parseResponseTranslate(arr, lang) {
  return `Translated text to ${lang}: ${arr[0]}`;
}
