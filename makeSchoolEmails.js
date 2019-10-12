const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
const moment = require('moment')
const endPoint = 'https://api.sendgrid.com/v3/contactdb/recipients'
let requestBody = []
let emails = []
const production = true
const rejectedPeople = require('./private/rejected').rejected
console.log(rejectedPeople.length)
const testingEmails = ['rsf.sho@gmail.com']
//const testingEmails = []
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
  this.waiver_completed = input.waiverStatus === 2
  this.id = input.id

  if (rejectedPeople.indexOf(Number(input.id)) === -1) {
    this.accepted = true

  } else {
    this.accepted = false
    console.log('Denied', input.name)
  }
  if (input.ticket_class_name === 'High school Student') {
    this.role = 'attendee'
    this.school = input.answers[1].answer
  } else if (input.ticket_class_name === 'Mentor/Judge') {
    if (input.answers[14].answer === "Judge") {
      this.role = "judge"
    } else {
      this.role = "mentor"
    }
  } else {
    this.role = 'volunteer'
  }
}

const db = admin.firestore();
const peopleRef = db.collection('people').where('ticket_class_name', '==', 'High school Student');
const allPeople = {}
const allPeopleArray = []

function sendEmail(email, templateID, fullName, inputData) {
  const mailBody = {
    "personalizations": [
      {
        "to": [
          {
            "email": email,
            "name": fullName
          }
        ],
        "dynamic_template_data": inputData
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
    "template_id": templateID,
    "tracking_settings": {
      "click_tracking": {
        'enable': true
      }
    }
  };
  // log.info(JSON.stringify(mailBody))\
  if (production === true || testingEmails.indexOf(email) > -1) {
    console.log(`sending to ${email}`)

    fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + keys.sendGrid,
        "content-type": "application/json"
      },
      body: JSON.stringify(mailBody)
    }).then(() => {
      console.log('sent to', email)
    }).catch(e => {
      console.log(e)
    });


  }

}

peopleRef.get().then(data => {
  data.forEach(snap => {
    const person = snap.data()
    const cleanedPerson = new Person(person)
    const waiverLink = `https://waivers.hyphen-hacks.com/#/p/${cleanedPerson.id}`;
    allPeople[cleanedPerson.id] = cleanedPerson
    allPeopleArray.push(cleanedPerson)

    if (cleanedPerson.accepted) {
      sendEmail(cleanedPerson.email, 'd-f6c009bd624b466d8898f77afd76fd81', cleanedPerson.name, {
        name: cleanedPerson.firstName, link: waiverLink
      })
    }

  })
  fs.writeFile('./private/MakeSchoolEmails.json', JSON.stringify(allPeople), (e) => {
    console.log(e)
    console.log('written', allPeopleArray.length, 'people')
  })
})