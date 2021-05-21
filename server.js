require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: "false" }));
mongoose.connect(process.env.MONGO_URI , { useNewUrlParser: true, useUnifiedTopology: true });

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const Schema = mongoose.Schema;

const urlSchema = new Schema({
  url: { type: String, required: true },
  date: { type: Date, default: Date.now },
  shortId: { type: Number, default: 1 }
});

const Url = mongoose.model("Url", urlSchema);

app.post("/api/shorturl", (req, res) => {
  var urlRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
  urlRegex = new RegExp(urlRegex);

  if(req.body.url.match(urlRegex)){
    var newUrl = new Url({
      url: req.body.url
    });

    let getLastTwoRecord = Url.find({})
                          .sort({ shortId: -1 })
                          .limit(2)

    let updateShortId = (newRecord, lastRecord) => {
      // let newShortId = lastRecord === null ? newRecord.shortId : lastRecord.shortId + 1;
      // let update = Url.updateOne({ shortId: newRecord.shortId }, { $set: { shortId: newShortId }})
      newRecord.shortId = lastRecord === null ? newRecord.shortId : lastRecord.shortId + 1;
      return newRecord.save();
    };


    newUrl.save().then(data => {
      getLastTwoRecord.then(allRecord => {
        let lastRecord = allRecord[1];
        updateShortId(data, lastRecord).then(updatedData => {
            res.json({ original_url : updatedData.url, short_url : updatedData.shortId});
        })
      })
    })
  }else{
    res.json({ error: 'invalid url' })
  }
});

app.get("/api/shorturl/:short_url", (req, res) => {

  Url.findOne({ "shortId": Number(req.params.short_url)})
        .then(data => res.redirect(data.url))
        .catch(err => res.json({ error: `can't find shortId ${req.params.short_url}`}))
  
  // delete old record
  let now = new Date();
  let today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  Url.deleteMany({"date": {$lt: today}})
        .then(data => console.log(data))
        .catch(err => console.log(err));
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
