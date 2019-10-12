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
  this.id = input.id
  this.email = input.email
  this.name = input.name
  this.referrer = 'hyphen-hacks_2019'
  this.years_involved = '2019'
  this.waiver_completed = 'true'
  this.earlyBirdBonus = 'true'
  this.role = 'attendee'
  this.created = input.created

}

let beforeAugust1st = []
let allBetweenAug1stAndSept30th = []
const db = admin.firestore();
const peopleRef = db.collection('people');
const queryRef = peopleRef.where('ticket_class_name', '==', 'High school Student');

let allPeople = []
queryRef.get().then(snap => {


  snap.forEach(rawPerson => {
    const person = new Person(rawPerson.data())
    allPeople.push(rawPerson.data())

    console.log(person.created)

    if (moment(rawPerson.created).isValid()) {
      if (moment(rawPerson.created).isBefore('2019-8-1')) {
        beforeAugust1st.push(person)
      } else {
        if (moment(rawPerson.created).isAfter('2019-8-1') && moment(rawPerson.created).isBefore('2019-9-12')) {
          allBetweenAug1stAndSept30th.push(person)
        } else {
          console.log('UR LATE')
        }
      }
    } else {
      console.log('UR DATE SUCKS')
    }


    emails.push(person.email)
  })
  fs.writeFile('./private/earlyburd.json', JSON.stringify({beforeAugust1st, allBetweenAug1stAndSept30th}), i => {
    console.log('written')
  })
  fs.writeFile('./private/roster.json', JSON.stringify(allPeople), i => {
    console.log('written')
  })
})