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
  this.waiver_completed = input.waiverStatus === 2
  this.id = input.id
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
peopleRef.get().then(data => {
  data.forEach(snap => {
    const person = snap.data()
    const cleanedPerson = new Person(person)
    allPeople[cleanedPerson.id] = cleanedPerson

  })
  fs.writeFile('./private/finalEmailExtravaganza.json', JSON.stringify(allPeople), (e) => {
    console.log(e)
  })
})