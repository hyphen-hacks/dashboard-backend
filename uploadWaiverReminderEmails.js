const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
const moment = require('moment')
const endPoint = 'https://api.sendgrid.com/v3/contactdb/recipients'
let requestBody = []
let emails = []

admin.initializeApp({
  credential: admin.credential.cert(keys.firebase),
  databaseURL: "https://hyphen-hacks-2019.firebaseio.com"
});

function Person(input) {
  this.email = input.email
  this.name = input.name
  this.firstName = input.profile.first_name
  this.referrer = 'hyphen-hacks_2019'
  this.years_involved = '2019'
  this.waiver_completed = 'false'
  this.id = input.id
  if (input.ticket_class_name === 'High school Student') {
    this.role = 'attendee'
  } else {
    this.role = 'mentor'
  }
}

const db = admin.firestore();
const peopleRef = db.collection('people');

peopleRef.get().then(data => {
  data.forEach(snap => {
    const person = snap.data()
    if (person.waiverStatus !== 2) {
      const cleanedPerson = new Person(person)
      if (emails.indexOf(cleanedPerson.email) > 0) {
        console.log('email dup', cleanedPerson.email)
      } else {
        requestBody.push(cleanedPerson)
        const mailBody = {
          "personalizations": [
            {
              "to": [
                {
                  "email": cleanedPerson.email,
                  "name": cleanedPerson.name
                }
              ],
              "dynamic_template_data": {
                "name": cleanedPerson.firstName,
                "link": `https://waivers.hyphen-hacks.com/#/p/${cleanedPerson.id}`
              }
            }
          ],
          "from": {
            "email": "noreply@hyphen-hacks.com",
            "name": "Ronan at Hyphen Hacks"
          },
          "reply_to": {
            "email": "support@hyphen-hacks.com",
            "name": "Ronan"
          },
          "template_id": "d-ca87886790714717846b7a818ca970de",
          "tracking_settings": {
            "click_tracking": {
              'enable': true
            }
          }
        };
        // log.info(JSON.stringify(mailBody))
        fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'post',
          headers: {
            'Authorization': 'Bearer ' + keys.sendGrid,
            "content-type": "application/json"
          },
          body: JSON.stringify(mailBody)
        }).then(() => {
          console.log('sent to', cleanedPerson.email)
        }).catch(e => {
          console.log(e)
        });
      }
      emails.push(cleanedPerson.email)
    }

  })
  console.log('Cleaned:', emails.length, 'people')
  fs.writeFile('./private/emailsUploadWaivers.json', JSON.stringify(requestBody), e => {
    console.log(e)
  })
})
/*
fetch(endPoint, {
  method: 'post',
  headers: {
    Authorization: 'Bearer ' + keys.sendGrid
  },
  body: JSON.stringify(requestBody)
}).then(e => e.json()).then(e => {
  console.log(e)
  fs.writeFile('./private/emailsErrorWaiver.json', JSON.stringify(e), err => {
    console.log(err)
  })
})
});
*/