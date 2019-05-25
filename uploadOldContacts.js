const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
const moment = require('moment')
const endPoint = 'https://api.sendgrid.com/v3/contactdb/recipients'
let requestBody = []
let emails = []
function Person(input) {
  this.email = input.email
  this.name = input.name
  this.referer = 'hyphen-hacks-2018'
  this.interests = `${input.role}, returning`
  this.years_involved = '2018'
  this.role = input.role
}

admin.initializeApp({
  credential: admin.credential.cert(keys.firebaseOld),
  databaseURL: "https://hyphenhacks-dc851.firebaseio.com"
});
const db = admin.database();
const ref = db.ref('/attendeeDB/people')
ref.once('value', (snap) => {
  const data = snap.val()
  for (let property in data) {
    if (data.hasOwnProperty(property)) {
      const person = data[property]

      const cleanedPerson = new Person(person)
      if (emails.indexOf(cleanedPerson.email) > 0) {
        console.log('email dup', cleanedPerson.email)
      } else {
        requestBody.push(cleanedPerson)
      }
      emails.push(cleanedPerson.email)
      //console.log(cleanedPerson)

    }
  }
  console.log('Cleaned:', requestBody.length, 'people')
  fs.writeFile('./private/emailsUpload.json', JSON.stringify(requestBody), (e)=> {console.log(e)})

  fetch(endPoint, {
    method: 'post',
    headers: {
      Authorization: 'Bearer ' + keys.sendGrid
    },
    body: JSON.stringify(requestBody)
  }).then(e => e.json()).then(e => {
    console.log(e)
    fs.writeFile('./private/emailsError.json', JSON.stringify(e), err => {console.log(err)})
  })

})