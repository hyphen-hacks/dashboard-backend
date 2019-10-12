const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
const moment = require('moment')
const endPoint = 'https://api.sendgrid.com/v3/contactdb/recipients'
let requestBody = []
let emails = []
const flagged = require('./private/schoolFlags.json')

admin.initializeApp({
  credential: admin.credential.cert(keys.firebase),
  databaseURL: "https://hyphen-hacks-2019.firebaseio.com"
});

flagged.forEach(i => {
  console.log(i)
  admin.firestore().collection('people').doc(i.eventID).update({notes: 'Please ask them what school they go to and make note of it here. (make sure to save)'}).then(i => {
    console.log('updated')
  })
})