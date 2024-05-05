const express = require('express');
const app = express();
const port = 8082;

// Multi file support
const fs = require('fs');
const path = require('path');

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.set('etag', false);
  next();
});

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

const config = loadConfig();

app.use(express.static('.'));

app.get('/sources', (req, res) => {
  res.json(config.sources.map(source => source.name));
});

app.get('/list-files/:sourceName', (req, res) => {
  const source = config.sources.find(s => s.name === req.params.sourceName);
  if (!source) {
    res.status(404).send({ message: "Source not found!" });
    return;
  }
  const directoryPath = path.join(__dirname, source.textsDirectory);
  fs.readdir(directoryPath, function(err, files) {
    if (err) {
      res.status(500).send({ message: "Unable to scan files!" });
      return;
    }
    res.json(files);
  });
});

app.get('/filename-mapping/:sourceName', (req, res) => {
  const source = config.sources.find(s => s.name === req.params.sourceName);
  if (!source) {
    return res.status(404).send({ message: "Source not found!" });
  }
  const mappingPath = path.join(__dirname, source.filenameMapping);
  res.sendFile(mappingPath);
});

app.get('/list-files/:sourceName/:filename', (req, res) => {
  const source = config.sources.find(s => s.name === req.params.sourceName);
  if (!source) {
      return res.status(404).send({ message: "Source not found!" });
  }
  const filePath = path.join(__dirname, source.textsDirectory, req.params.filename);
  fs.readFile(filePath, 'utf8', function(err, data) {
      if (err) {
          res.status(500).send({ message: "Unable to read file!" });
          return;
      }
      res.send(data);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

