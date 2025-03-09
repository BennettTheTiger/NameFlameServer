/* eslint-disable no-unused-vars */
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');

async function getNameDefinitionv1(name) {
  try {
    console.log(`Fetching definition for the name "${name}"`);
    // Make a request to the URL
    const response = await axios.get(`https://www.behindthename.com/name/${name}`);

    // Load the HTML into cheerio
    const $ = cheerio.load(response.data);

    // Get the contents of the element with class "namedef"
    const nameDef = $('.namedef').text().trim();
    const usg = $('.usg').map((i, el) => $(el).text()).get();

    return { nameDef, usg };

    // Print the contents
  } catch (error) {
    console.error('Error fetching the name definition:', error.message);
  }
}

async function getNameDefinitionv2(name) {
    const nameToFetch = String(name).toLowerCase();
    try {
      // Make a request to the URL
      const response = await axios.get(`https://www.thebump.com/b/${nameToFetch}-baby-name`);

      // Load the HTML into cheerio
      const $ = cheerio.load(response.data);

      // Get the contents of the element with class "namedef"
      const description = $('.description').text().trim();
      const pronunciation = $('.pronunciation').text().trim();

      // Find the element with the text "meaning"
        const values = {};
      $('.infoDetail').map((i, el) => {
            const value = $(el).text();
            const key = $(el).parent().text().replace(value, '');
            if (key === 'Meaning:') {
                values.meaning = value;
            }
            if (key === 'Origin:') {
                values.origin = value;
            }
      });

      return { description, pronunciation, ...values };

      // Print the contents
    } catch (error) {
      console.error('Error fetching the name definition:', error.message);
    }
  }

async function processNames() {
  const uri = `mongodb+srv://nameflameserver:${process.env.DB_PASSWORD}@cluster0.b9oa5.mongodb.net/app-data?retryWrites=true&w=majority&appName=Cluster0`; // Replace with your MongoDB connection string
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  let namesCounted = 1;
  let failedCount = 0;
  try {
    await client.connect();
    const database = client.db('app-data');
    const collection = database.collection('names');

    const cursor = collection.find({});
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const name = doc.name; // Adjust this based on your document structure
      console.log(`Processing the name: ${name} count: ${namesCounted}`);
      await getNameDefinitionv2(name).then((result) => {
        // Update the document with the name definition
        const newData = {
            pronunciation: result.pronunciation,
            origin: result.origin,
            meaning: result.meaning,
        };
        if (doc.about.length < result.description.length) {
            newData.about = result.description;
        }
        collection.updateOne({ _id: doc._id }, { $set: newData });
      }).catch((error) => {
        failedCount++;
        console.error(`Error processing the name: ${name}`, error.message);
      });
      namesCounted++;
    }
    console.log(`${namesCounted} names processed successfully! ${failedCount} names failed.`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
  } finally {
    await client.close();
  }
}

 // processNames();
// getNameDefinitionv1('Bennett');
 //getNameDefinitionv2('Bennett');