const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
const moment = require('moment')
const endPoint = 'https://api.sendgrid.com/v3/contactdb/recipients'
let requestBody = []
let emails = []
const production = false
const testingEmails = ['rsf.sho@gmail.com', 'ben.grant@hyphen-hacks.com']
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
  this.accepted = true
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
const peopleRef = db.collection('people');
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
    if (cleanedPerson.role === 'attendee') {
      if (cleanedPerson.accepted) {
        if (cleanedPerson.waiver_completed) {
          sendEmail(cleanedPerson.email, 'd-81c4d26aa4574d289eff3cf892596824', cleanedPerson.name, {name: cleanedPerson.firstName})
        } else {
          sendEmail(cleanedPerson.email, 'd-50efd77ef14e4070ae652c985f15cb1c', cleanedPerson.name, {name: cleanedPerson.firstName, link: waiverLink})
        }
      }
    } else if (cleanedPerson.role === 'mentor') {
      sendEmail(cleanedPerson.email, 'd-63fa98c6bb434510be75cd774cdf3a29', cleanedPerson.name, {name: cleanedPerson.firstName, link: waiverLink})
    } else if (cleanedPerson.role === "judge") {
      sendEmail(cleanedPerson.email, 'd-b850ff8ea01e4ee780cf0364734fd8b1', cleanedPerson.name, {name: cleanedPerson.firstName, link: waiverLink})
    } else if (cleanedPerson.role === "volunteer") {
      sendEmail(cleanedPerson.email, 'd-d11283fd535a465f8ffb07dd00a0719e', cleanedPerson.name, {name: cleanedPerson.firstName, link: waiverLink})
    }
  })
  fs.writeFile('./private/finalEmailExtravaganza.json', JSON.stringify(allPeople), (e) => {
    console.log(e)
    console.log('written', allPeopleArray.length, 'people')
  })
})